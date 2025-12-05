// Aplicación Principal MenteVivaAR - Conexión directa a Firebase
const app = {
    data: null,
    currentCharts: [],
    firebaseURL: 'https://fcar-9d923-default-rtdb.firebaseio.com/.json',

    // Inicializar aplicación
    async init() {
        try {
            await this.loadDataFromFirebase();
            console.log('Datos cargados correctamente desde Firebase');
            
            // Opcional: Actualizar datos cada 30 segundos
            setInterval(() => {
                this.loadDataFromFirebase();
                console.log('Datos actualizados automáticamente');
            }, 30000); // 30 segundos
            
        } catch (error) {
            console.error('Error al inicializar:', error);
            alert('Error al cargar los datos de Firebase. Verifica tu conexión.');
        }
    },

    // Cargar datos directamente desde Firebase
    async loadDataFromFirebase() {
        try {
            const response = await fetch(this.firebaseURL);
            
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            this.data = data;
            
            // Si estamos en la página de estadísticas y hay filtros aplicados, refrescar
            if (document.getElementById('statistics').classList.contains('active')) {
                const resultsSection = document.getElementById('resultsSection');
                if (resultsSection.classList.contains('active')) {
                    this.applyFilters();
                }
            }
            
        } catch (error) {
            console.error('Error cargando datos desde Firebase:', error);
            throw error;
        }
    },

    // Mostrar página
    showPage(pageId) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        
        document.getElementById(pageId).classList.add('active');
        event.target.classList.add('active');
        
        if (pageId === 'statistics') {
            document.getElementById('resultsSection').classList.remove('active');
            document.getElementById('userDetail').classList.remove('active');
        }
    },

    // Aplicar filtros
    applyFilters() {
        const ageFilter = document.getElementById('ageFilter').value;
        const sortBy = document.getElementById('sortBy').value;
        const searchText = document.getElementById('searchInput').value.toLowerCase();

        if (!this.data || !this.data.usuarios) {
            alert('No hay datos disponibles. Verifica la conexión a Firebase.');
            return;
        }

        let users = Object.values(this.data.usuarios);

        // Filtrar por edad
        if (ageFilter !== 'all') {
            users = users.filter(u => {
                if (ageFilter === 'young') return u.edad < 60;
                if (ageFilter === 'middle') return u.edad >= 60 && u.edad <= 70;
                if (ageFilter === 'senior') return u.edad > 70;
                return true;
            });
        }

        // Filtrar por búsqueda
        if (searchText) {
            users = users.filter(u => 
                u.nombre.toLowerCase().includes(searchText) || 
                u.pin.includes(searchText)
            );
        }

        // Ordenar
        users.sort((a, b) => {
            if (sortBy === 'name') return a.nombre.localeCompare(b.nombre);
            if (sortBy === 'age-asc') return a.edad - b.edad;
            if (sortBy === 'age-desc') return b.edad - a.edad;
            if (sortBy === 'pin') return a.pin.localeCompare(b.pin);
            return 0;
        });

        this.displayUsers(users);
    },

    // Mostrar usuarios
    displayUsers(users) {
        const grid = document.getElementById('usersGrid');
        const noResults = document.getElementById('noResults');
        const resultsSection = document.getElementById('resultsSection');
        const resultsTitle = document.getElementById('resultsTitle');

        resultsSection.classList.add('active');

        if (users.length === 0) {
            grid.innerHTML = '';
            noResults.style.display = 'block';
            resultsTitle.textContent = 'No se encontraron usuarios';
            return;
        }

        noResults.style.display = 'none';
        resultsTitle.textContent = `${users.length} Usuario${users.length !== 1 ? 's' : ''} Encontrado${users.length !== 1 ? 's' : ''}`;

        grid.innerHTML = users.map(user => `
            <div class="user-card" onclick="app.showUserDetail('${user.pin}')">
                <h4>👤 ${user.nombre}</h4>
                <p>📌 PIN: ${user.pin}</p>
                <p>🎂 Edad: ${user.edad} años</p>
            </div>
        `).join('');
    },

    // Mostrar detalle del usuario
    showUserDetail(pin) {
        const user = this.data.usuarios[pin];
        if (!user) return;

        const espacial = this.data.espacial[pin] ? Object.values(this.data.espacial[pin])[0] : null;
        const memoria = this.data.memoria[pin] ? Object.values(this.data.memoria[pin])[0] : null;
        const orientacion = this.data.orientacion[pin] ? Object.values(this.data.orientacion[pin])[0] : null;
        const rompecabezas = this.data.rompecabezas[pin] ? Object.values(this.data.rompecabezas[pin])[0] : null;

        document.getElementById('resultsSection').classList.remove('active');
        const detailDiv = document.getElementById('userDetail');
        detailDiv.classList.add('active');

        let html = `
            <button class="back-btn" onclick="app.showUsersList()">← Volver a resultados</button>
            
            <div class="user-header">
                <h2>👤 ${user.nombre}</h2>
                <p>PIN: ${user.pin} | Edad: ${user.edad} años</p>
            </div>

            <div class="stats-grid">
        `;

        // Espacial
        if (espacial) {
            html += `
                <div class="stat-card">
                    <h3>🗺️ Prueba Espacial</h3>
                    <div class="stat-row">
                        <span class="stat-label">Tiempo usado:</span>
                        <span class="stat-value">${espacial.tiempoUsado}s</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Tiempo promedio:</span>
                        <span class="stat-value">${espacial.tiempoPromedioRespuesta}s</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Fecha:</span>
                        <span class="stat-value">${espacial.fecha}</span>
                    </div>
                </div>
            `;
        }

        // Memoria
        if (memoria) {
            const badge = memoria.errores === 0 ? 'badge-success' : 
                         memoria.errores <= 2 ? 'badge-warning' : 'badge-danger';
            html += `
                <div class="stat-card">
                    <h3>🧠 Prueba de Memoria</h3>
                    <div class="stat-row">
                        <span class="stat-label">Errores:</span>
                        <span class="stat-value">${memoria.errores} <span class="badge ${badge}">${memoria.errores === 0 ? 'Perfecto' : memoria.errores <= 2 ? 'Bueno' : 'Mejorable'}</span></span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Tiempo usado:</span>
                        <span class="stat-value">${memoria.tiempoUsado}s</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Fecha:</span>
                        <span class="stat-value">${memoria.fecha}</span>
                    </div>
                </div>
            `;
        }

        // Orientación
        if (orientacion) {
            const errores = parseInt(orientacion.errores);
            const badge = errores === 0 ? 'badge-success' : 
                         errores <= 3 ? 'badge-warning' : 'badge-danger';
            html += `
                <div class="stat-card">
                    <h3>🧭 Prueba de Orientación</h3>
                    <div class="stat-row">
                        <span class="stat-label">Errores:</span>
                        <span class="stat-value">${orientacion.errores} <span class="badge ${badge}">${errores === 0 ? 'Excelente' : errores <= 3 ? 'Bueno' : 'Mejorable'}</span></span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Tiempo usado:</span>
                        <span class="stat-value">${orientacion.tiempoUsado}s</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Fecha:</span>
                        <span class="stat-value">${orientacion.fecha}</span>
                    </div>
                </div>
            `;
        }

        // Rompecabezas
        if (rompecabezas) {
            const badge = rompecabezas.porcentajeError < 50 ? 'badge-success' : 
                         rompecabezas.porcentajeError < 75 ? 'badge-warning' : 'badge-danger';
            html += `
                <div class="stat-card">
                    <h3>🧩 Prueba de Rompecabezas</h3>
                    <div class="stat-row">
                        <span class="stat-label">Porcentaje error:</span>
                        <span class="stat-value">${rompecabezas.porcentajeError}% <span class="badge ${badge}">${rompecabezas.porcentajeError < 50 ? 'Excelente' : rompecabezas.porcentajeError < 75 ? 'Bueno' : 'Difícil'}</span></span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Tiempo usado:</span>
                        <span class="stat-value">${rompecabezas.tiempoUsado}s</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Fecha:</span>
                        <span class="stat-value">${rompecabezas.fecha}</span>
                    </div>
                </div>
            `;
        }

        html += '</div>';

        // Gráficas
        if (espacial || memoria || orientacion || rompecabezas) {
            html += `
                <div class="chart-section">
                    <h3>📊 Comparación de Tiempos</h3>
                    <div class="chart-container">
                        <canvas id="userTimeChart"></canvas>
                    </div>
                </div>

                <div class="chart-section">
                    <h3>🎯 Rendimiento General</h3>
                    <div class="chart-container">
                        <canvas id="userPerformanceChart"></canvas>
                    </div>
                </div>
            `;
        }

        detailDiv.innerHTML = html;

        // Crear gráficas
        setTimeout(() => {
            this.createUserCharts(espacial, memoria, orientacion, rompecabezas);
        }, 100);
    },

    // Crear gráficas del usuario
    createUserCharts(espacial, memoria, orientacion, rompecabezas) {
        // Destruir gráficas anteriores
        this.currentCharts.forEach(chart => chart.destroy());
        this.currentCharts = [];

        const labels = [];
        const times = [];
        const performances = [];

        if (espacial) {
            labels.push('Espacial');
            times.push(espacial.tiempoUsado);
            performances.push(85);
        }
        if (memoria) {
            labels.push('Memoria');
            times.push(memoria.tiempoUsado);
            const score = Math.max(0, 100 - (memoria.errores * 15));
            performances.push(score);
        }
        if (orientacion) {
            labels.push('Orientación');
            times.push(orientacion.tiempoUsado);
            const score = Math.max(0, 100 - (parseInt(orientacion.errores) * 8));
            performances.push(score);
        }
        if (rompecabezas) {
            labels.push('Rompecabezas');
            times.push(rompecabezas.tiempoUsado);
            performances.push(100 - rompecabezas.porcentajeError);
        }

        // Gráfica de tiempos
        const ctx1 = document.getElementById('userTimeChart');
        if (ctx1) {
            const chart1 = new Chart(ctx1.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Tiempo (segundos)',
                        data: times,
                        backgroundColor: ['#667eea', '#764ba2', '#ff9800', '#4caf50'],
                        borderColor: ['#667eea', '#764ba2', '#ff9800', '#4caf50'],
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });
            this.currentCharts.push(chart1);
        }

        // Gráfica de rendimiento
        const ctx2 = document.getElementById('userPerformanceChart');
        if (ctx2) {
            const chart2 = new Chart(ctx2.getContext('2d'), {
                type: 'radar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Rendimiento (%)',
                        data: performances,
                        backgroundColor: 'rgba(102, 126, 234, 0.2)',
                        borderColor: 'rgba(102, 126, 234, 1)',
                        borderWidth: 2,
                        pointBackgroundColor: 'rgba(102, 126, 234, 1)',
                        pointBorderColor: '#fff',
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: 'rgba(102, 126, 234, 1)'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        r: {
                            beginAtZero: true,
                            max: 100,
                            ticks: { stepSize: 20 }
                        }
                    }
                }
            });
            this.currentCharts.push(chart2);
        }
    },

    // Volver a la lista de usuarios
    showUsersList() {
        document.getElementById('userDetail').classList.remove('active');
        document.getElementById('resultsSection').classList.add('active');
    },

    // Método para refrescar datos manualmente
    async refreshData() {
        try {
            await this.loadDataFromFirebase();
            alert('Datos actualizados correctamente');
            
            // Si hay filtros aplicados, reaplicarlos
            const resultsSection = document.getElementById('resultsSection');
            if (resultsSection.classList.contains('active')) {
                this.applyFilters();
            }
        } catch (error) {
            alert('Error al actualizar los datos');
        }
    }
};

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});