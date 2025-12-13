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

    // Obtener la versión más reciente de una prueba para un usuario
    getLatestTestData(testData) {
        if (!testData) return null;
        
        // Obtener todas las versiones del test
        const versions = Object.values(testData);
        
        // Si solo hay una versión, retornarla
        if (versions.length === 1) return versions[0];
        
        // Ordenar por fecha (más reciente primero)
        versions.sort((a, b) => {
            const dateA = new Date(a.fecha.replace(' ', 'T'));
            const dateB = new Date(b.fecha.replace(' ', 'T'));
            return dateB - dateA;
        });
        
        return versions[0];
    },

    // Obtener todas las versiones ordenadas cronológicamente
    getAllTestVersions(testData) {
        if (!testData) return [];
        
        const versions = Object.values(testData);
        
        // Ordenar por fecha (más antigua primero)
        versions.sort((a, b) => {
            const dateA = new Date(a.fecha.replace(' ', 'T'));
            const dateB = new Date(b.fecha.replace(' ', 'T'));
            return dateA - dateB;
        });
        
        return versions;
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

        // Obtener los datos más recientes de cada prueba
        const espacial = this.getLatestTestData(this.data.espacial[pin]);
        const memoria = this.getLatestTestData(this.data.memoria[pin]);
        const orientacion = this.getLatestTestData(this.data.orientacion[pin]);
        const rompecabezas = this.getLatestTestData(this.data.rompecabezas[pin]);

        // Obtener todas las versiones para gráficas de progreso
        const espacialVersions = this.getAllTestVersions(this.data.espacial[pin]);
        const memoriaVersions = this.getAllTestVersions(this.data.memoria[pin]);
        const orientacionVersions = this.getAllTestVersions(this.data.orientacion[pin]);
        const rompecabezasVersions = this.getAllTestVersions(this.data.rompecabezas[pin]);

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
            const numVersions = espacialVersions.length;
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
                    ${numVersions > 1 ? `<div class="stat-row"><span class="badge badge-info">📊 ${numVersions} registros</span></div>` : ''}
                </div>
            `;
        }

        // Memoria
        if (memoria) {
            const numVersions = memoriaVersions.length;
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
                    ${numVersions > 1 ? `<div class="stat-row"><span class="badge badge-info">📊 ${numVersions} registros</span></div>` : ''}
                </div>
            `;
        }

        // Orientación
        if (orientacion) {
            const numVersions = orientacionVersions.length;
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
                    ${numVersions > 1 ? `<div class="stat-row"><span class="badge badge-info">📊 ${numVersions} registros</span></div>` : ''}
                </div>
            `;
        }

        // Rompecabezas
        if (rompecabezas) {
            const numVersions = rompecabezasVersions.length;
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
                    ${numVersions > 1 ? `<div class="stat-row"><span class="badge badge-info">📊 ${numVersions} registros</span></div>` : ''}
                </div>
            `;
        }

        html += '</div>';

        // Gráficas
        if (espacial || memoria || orientacion || rompecabezas) {
            html += `
                <div class="chart-section">
                    <h3>📊 Comparación de Tiempos (Última Prueba)</h3>
                    <div class="chart-container">
                        <canvas id="userTimeChart"></canvas>
                    </div>
                </div>

                <div class="chart-section">
                    <h3>🎯 Rendimiento General (Última Prueba)</h3>
                    <div class="chart-container">
                        <canvas id="userPerformanceChart"></canvas>
                    </div>
                </div>
            `;

            // Gráficas de progreso si hay múltiples versiones
            const hasProgress = espacialVersions.length > 1 || memoriaVersions.length > 1 || 
                               orientacionVersions.length > 1 || rompecabezasVersions.length > 1;
            
            if (hasProgress) {
                html += `
                    <div class="chart-section">
                        <h3>📈 Evolución del Tiempo por Prueba</h3>
                        <div class="chart-container">
                            <canvas id="progressTimeChart"></canvas>
                        </div>
                    </div>

                    <div class="chart-section">
                        <h3>📉 Evolución de Errores</h3>
                        <div class="chart-container">
                            <canvas id="progressErrorsChart"></canvas>
                        </div>
                    </div>
                `;
            }
        }

        detailDiv.innerHTML = html;

        // Crear gráficas
        setTimeout(() => {
            this.createUserCharts(espacial, memoria, orientacion, rompecabezas);
            
            // Crear gráficas de progreso si hay datos
            if (espacialVersions.length > 1 || memoriaVersions.length > 1 || 
                orientacionVersions.length > 1 || rompecabezasVersions.length > 1) {
                this.createProgressCharts(espacialVersions, memoriaVersions, orientacionVersions, rompecabezasVersions);
            }
        }, 100);
    },

    // Crear gráficas del usuario (última versión)
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

    // Crear gráficas de progreso temporal
    createProgressCharts(espacialVersions, memoriaVersions, orientacionVersions, rompecabezasVersions) {
        const maxVersions = Math.max(
            espacialVersions.length,
            memoriaVersions.length,
            orientacionVersions.length,
            rompecabezasVersions.length
        );

        const versionLabels = Array.from({length: maxVersions}, (_, i) => `Intento ${i + 1}`);

        // Gráfica de evolución de tiempos
        const ctx3 = document.getElementById('progressTimeChart');
        if (ctx3) {
            const datasets = [];

            if (espacialVersions.length > 1) {
                datasets.push({
                    label: 'Espacial',
                    data: espacialVersions.map(v => v.tiempoUsado),
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4
                });
            }

            if (memoriaVersions.length > 1) {
                datasets.push({
                    label: 'Memoria',
                    data: memoriaVersions.map(v => v.tiempoUsado),
                    borderColor: '#764ba2',
                    backgroundColor: 'rgba(118, 75, 162, 0.1)',
                    tension: 0.4
                });
            }

            if (orientacionVersions.length > 1) {
                datasets.push({
                    label: 'Orientación',
                    data: orientacionVersions.map(v => v.tiempoUsado),
                    borderColor: '#ff9800',
                    backgroundColor: 'rgba(255, 152, 0, 0.1)',
                    tension: 0.4
                });
            }

            if (rompecabezasVersions.length > 1) {
                datasets.push({
                    label: 'Rompecabezas',
                    data: rompecabezasVersions.map(v => v.tiempoUsado),
                    borderColor: '#4caf50',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    tension: 0.4
                });
            }

            const chart3 = new Chart(ctx3.getContext('2d'), {
                type: 'line',
                data: {
                    labels: versionLabels,
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: true, position: 'top' },
                        title: {
                            display: true,
                            text: 'Evolución del tiempo (segundos) - Menor es mejor'
                        }
                    },
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });
            this.currentCharts.push(chart3);
        }

        // Gráfica de evolución de errores
        const ctx4 = document.getElementById('progressErrorsChart');
        if (ctx4) {
            const datasets = [];

            if (memoriaVersions.length > 1) {
                datasets.push({
                    label: 'Memoria',
                    data: memoriaVersions.map(v => v.errores),
                    borderColor: '#764ba2',
                    backgroundColor: 'rgba(118, 75, 162, 0.1)',
                    tension: 0.4
                });
            }

            if (orientacionVersions.length > 1) {
                datasets.push({
                    label: 'Orientación',
                    data: orientacionVersions.map(v => parseInt(v.errores)),
                    borderColor: '#ff9800',
                    backgroundColor: 'rgba(255, 152, 0, 0.1)',
                    tension: 0.4
                });
            }

            if (rompecabezasVersions.length > 1) {
                datasets.push({
                    label: 'Rompecabezas (% error)',
                    data: rompecabezasVersions.map(v => v.porcentajeError),
                    borderColor: '#4caf50',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    tension: 0.4
                });
            }

            const chart4 = new Chart(ctx4.getContext('2d'), {
                type: 'line',
                data: {
                    labels: versionLabels,
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: true, position: 'top' },
                        title: {
                            display: true,
                            text: 'Evolución de errores - Menor es mejor'
                        }
                    },
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });
            this.currentCharts.push(chart4);
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
