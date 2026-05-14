// Aplicación Principal MenteVivaAR - Versión Corregida
const app = {
    data: null,
    currentCharts: [],

    // ==========================================
    // LOGIN DIRECTO
    // ==========================================
    async handleLogin(event) {
        event.preventDefault();
        const userInp = document.getElementById('username').value.trim();
        const passInp = document.getElementById('password').value.trim();
        const errorMsg = document.getElementById('loginError');

        try {
            // 1. Validamos contra tu JSON de admins
            const response = await fetch("https://fcar-9d923-default-rtdb.firebaseio.com/admins/danilo_espe.json");
            const adminData = await response.json();

            if (adminData && adminData.usuario === userInp && adminData.clave === passInp) {
                
                // 2. Autenticación anónima para cumplir con la regla "auth != null"
                await firebase.auth().signInAnonymously();

                sessionStorage.setItem('isAdmin', 'true');
                sessionStorage.setItem('adminName', adminData.nombre);
                document.getElementById('loginBtn').textContent = "Cerrar Sesión";
                
                alert(`✅ Bienvenido, ${adminData.nombre}`);
                this.showPage('statistics');
                
                // 3. Cargar los datos con permiso
                await this.loadData(); 
                
            } else {
                errorMsg.textContent = "❌ Usuario o contraseña incorrectos";
                errorMsg.style.display = 'block';
            }
        } catch (error) {
            console.error("Error:", error);
            alert("Error: Asegúrate de habilitar 'Anonymous Sign-in' en la consola de Firebase > Authentication.");
        }
    },

    logout() {
        firebase.auth().signOut();
        sessionStorage.clear();
        document.getElementById('loginBtn').textContent = "Acceso Admin";
        alert('Sesión cerrada');
        this.showPage('home');
    },

    // ==========================================
    // INICIALIZACIÓN
    // ==========================================
    init() {
        console.log("Iniciando app...");

        // Verificar si hay sesión activa
        const isAdmin = sessionStorage.getItem('isAdmin');
        if (isAdmin === 'true') {
            document.getElementById('loginBtn').textContent = "Cerrar Sesión";
            document.getElementById('loginBtn').setAttribute('onclick', 'app.logout()');
        }

        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                console.log("Usuario autenticado");
                this.loadData();
            } else {
                console.log("No autenticado aún");
            }
        });
    },

    // ==========================================
    // CARGAR DATOS
    // ==========================================
    async loadData() {
        try {
            console.log("Intentando descargar datos...");

            const user = firebase.auth().currentUser;
            if (!user) {
                console.log("No hay usuario autenticado aún");
                return;
            }

            const token = await user.getIdToken();

            // Obtener datos con autenticación
            const response = await fetch(
                `https://fcar-9d923-default-rtdb.firebaseio.com/.json?auth=${token}`
            );

            const result = await response.json();

            if (result) {
                // Ajustar según la estructura de tu base de datos
                this.data = result.fc_ar ? result.fc_ar : result;
                console.log("✅ Datos procesados:", this.data);

                // Si estamos en la página de estadísticas, aplicar filtros
                if (document.getElementById('statistics').classList.contains('active')) {
                    this.applyFilters();
                }
            }

        } catch (error) {
            console.error("❌ Error cargando JSON:", error);
        }
    },

    // ==========================================
    // NAVEGACIÓN
    // ==========================================
    showPage(pageId) {
        // Verificar acceso a estadísticas
        if (pageId === 'statistics' && sessionStorage.getItem('isAdmin') !== 'true') {
            alert('⚠️ Debes iniciar sesión primero');
            pageId = 'login';
        }

        // Quitar todas las páginas activas
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

        // Quitar todos los botones activos
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

        // Activar la página solicitada
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.add('active');
        }

        // Activar el botón correspondiente
        const buttons = document.querySelectorAll('.nav-btn');
        buttons.forEach(btn => {
            const onclick = btn.getAttribute('onclick');
            if (onclick && onclick.includes(`'${pageId}'`)) {
                btn.classList.add('active');
            }
        });

        // Limpiar secciones de estadísticas si cambiamos de página
        if (pageId === 'statistics') {
            const resultsSection = document.getElementById('resultsSection');
            const userDetail = document.getElementById('userDetail');
            if (resultsSection) resultsSection.classList.remove('active');
            if (userDetail) userDetail.classList.remove('active');
        }
    },

    // ==========================================
    // FILTROS Y VISTAS
    // ==========================================
    applyFilters() {
        if (!this.data || !this.data.usuarios) {
            console.log("Esperando datos de usuarios...");
            alert('No hay datos disponibles. Por favor, espera un momento.');
            return;
        }

        const ageFilter = document.getElementById('ageFilter').value;
        const sortBy = document.getElementById('sortBy').value;
        const searchText = document.getElementById('searchInput').value.toLowerCase();

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
                (u.nombre && u.nombre.toLowerCase().includes(searchText)) || 
                (u.pin && u.pin.includes(searchText))
            );
        }

        // Ordenar
        users.sort((a, b) => {
            if (sortBy === 'name') return (a.nombre || "").localeCompare(b.nombre || "");
            if (sortBy === 'age-asc') return a.edad - b.edad;
            if (sortBy === 'age-desc') return b.edad - a.edad;
            if (sortBy === 'pin') return (a.pin || "").localeCompare(b.pin || "");
            return 0;
        });

        this.displayUsers(users);
    },

    displayUsers(users) {
        const grid = document.getElementById('usersGrid');
        const noResults = document.getElementById('noResults');
        const resultsSection = document.getElementById('resultsSection');
        const resultsTitle = document.getElementById('resultsTitle');

        if (!grid || !resultsSection) return;

        resultsSection.classList.add('active');

        if (users.length === 0) {
            grid.innerHTML = '';
            if (noResults) noResults.style.display = 'block';
            if (resultsTitle) resultsTitle.textContent = 'No se encontraron usuarios';
            return;
        }

        if (noResults) noResults.style.display = 'none';
        if (resultsTitle) resultsTitle.textContent = `${users.length} Usuario${users.length !== 1 ? 's' : ''} Encontrado${users.length !== 1 ? 's' : ''}`;

        grid.innerHTML = users.map(user => `
            <div class="user-card" onclick="app.showUserDetail('${user.pin}')">
                <h4>👤 ${user.nombre || 'Sin Nombre'}</h4>
                <p>📌 PIN: ${user.pin}</p>
                <p>🎂 Edad: ${user.edad} años</p>
            </div>
        `).join('');
    },

    // ==========================================
    // DETALLE DEL USUARIO
    // ==========================================
    showUserDetail(pin) {
        const user = this.data.usuarios[pin];
        if (!user) return;

        // Obtener los datos más recientes de cada prueba
        const espacial = this.getLatestTestData(this.data.espacial?.[pin]);
        const memoria = this.getLatestTestData(this.data.memoria?.[pin]);
        const orientacion = this.getLatestTestData(this.data.orientacion?.[pin]);
        const rompecabezas = this.getLatestTestData(this.data.rompecabezas?.[pin]);

        // Obtener todas las versiones para gráficas de progreso
        const espacialVersions = this.getAllTestVersions(this.data.espacial?.[pin]);
        const memoriaVersions = this.getAllTestVersions(this.data.memoria?.[pin]);
        const orientacionVersions = this.getAllTestVersions(this.data.orientacion?.[pin]);
        const rompecabezasVersions = this.getAllTestVersions(this.data.rompecabezas?.[pin]);

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

        // Tarjetas de estadísticas
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

        // Crear gráficas después de un pequeño delay
        setTimeout(() => {
            this.createUserCharts(espacial, memoria, orientacion, rompecabezas);
            
            // Crear gráficas de progreso si hay datos
            const hasProgress = espacialVersions.length > 1 || memoriaVersions.length > 1 || 
                               orientacionVersions.length > 1 || rompecabezasVersions.length > 1;
            if (hasProgress) {
                this.createProgressCharts(espacialVersions, memoriaVersions, orientacionVersions, rompecabezasVersions);
            }
        }, 100);
    },

    // ==========================================
    // FUNCIONES AUXILIARES
    // ==========================================
    getLatestTestData(testData) {
        if (!testData) return null;
        
        const versions = Object.values(testData);
        if (versions.length === 1) return versions[0];
        
        versions.sort((a, b) => {
            const dateA = new Date(a.fecha.replace(' ', 'T'));
            const dateB = new Date(b.fecha.replace(' ', 'T'));
            return dateB - dateA;
        });
        
        return versions[0];
    },

    getAllTestVersions(testData) {
        if (!testData) return [];
        
        const versions = Object.values(testData);
        
        versions.sort((a, b) => {
            const dateA = new Date(a.fecha.replace(' ', 'T'));
            const dateB = new Date(b.fecha.replace(' ', 'T'));
            return dateA - dateB;
        });
        
        return versions;
    },

    // ==========================================
    // CREAR GRÁFICAS
    // ==========================================
    createUserCharts(espacial, memoria, orientacion, rompecabezas) {
        // Destruir gráficas anteriores
        this.currentCharts.forEach(chart => chart.destroy());
        this.currentCharts = [];

        // Definir fuente global para Chart.js
        Chart.defaults.font.family = "'Inter', sans-serif";
        Chart.defaults.color = '#64748b';

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

        // Gráfica de tiempos (Bar Chart)
        const ctx1 = document.getElementById('userTimeChart');
        if (ctx1) {
            const chart1 = new Chart(ctx1.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Tiempo (segundos)',
                        data: times,
                        backgroundColor: ['#4f46e5', '#10b981', '#f59e0b', '#d946ef'],
                        borderWidth: 0,
                        borderRadius: 8,
                        barThickness: 40
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: '#0f172a',
                            padding: 12,
                            titleFont: { size: 14, weight: 'bold' },
                            bodyFont: { size: 13 },
                            cornerRadius: 8,
                            displayColors: false
                        }
                    },
                    scales: {
                        y: { 
                            beginAtZero: true,
                            grid: { color: '#f1f5f9', drawBorder: false }
                        },
                        x: {
                            grid: { display: false, drawBorder: false }
                        }
                    }
                }
            });
            this.currentCharts.push(chart1);
        }

        // Gráfica de rendimiento (Radar Chart mejorado)
        const ctx2 = document.getElementById('userPerformanceChart');
        if (ctx2) {
            const chart2 = new Chart(ctx2.getContext('2d'), {
                type: 'radar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Rendimiento (%)',
                        data: performances,
                        backgroundColor: 'rgba(79, 70, 229, 0.2)',
                        borderColor: '#4f46e5',
                        borderWidth: 3,
                        pointBackgroundColor: '#ffffff',
                        pointBorderColor: '#4f46e5',
                        pointBorderWidth: 2,
                        pointHoverBackgroundColor: '#4f46e5',
                        pointHoverBorderColor: '#ffffff',
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: '#0f172a',
                            padding: 12,
                            cornerRadius: 8,
                            callbacks: {
                                label: function(context) {
                                    return ' ' + context.formattedValue + '% de precisión';
                                }
                            }
                        }
                    },
                    scales: {
                        r: {
                            angleLines: { color: '#e2e8f0' },
                            grid: { color: '#e2e8f0' },
                            pointLabels: {
                                font: { size: 13, weight: '600' },
                                color: '#334155'
                            },
                            ticks: {
                                stepSize: 20,
                                max: 100,
                                min: 0,
                                backdropColor: 'transparent',
                                color: '#94a3b8'
                            }
                        }
                    }
                }
            });
            this.currentCharts.push(chart2);
        }
    },

    createProgressCharts(espacialVersions, memoriaVersions, orientacionVersions, rompecabezasVersions) {
        const maxVersions = Math.max(
            espacialVersions.length,
            memoriaVersions.length,
            orientacionVersions.length,
            rompecabezasVersions.length
        );

        const versionLabels = Array.from({length: maxVersions}, (_, i) => `Intento ${i + 1}`);

        // Opciones comunes para gráficas de líneas
        const commonLineOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { 
                    display: true, 
                    position: 'top',
                    labels: { usePointStyle: true, boxWidth: 8 }
                },
                tooltip: {
                    backgroundColor: '#0f172a',
                    padding: 12,
                    cornerRadius: 8,
                    usePointStyle: true
                }
            },
            scales: {
                y: { 
                    beginAtZero: true,
                    grid: { color: '#f1f5f9', drawBorder: false }
                },
                x: {
                    grid: { display: false, drawBorder: false }
                }
            },
            interaction: {
                mode: 'index',
                intersect: false,
            }
        };

        // Gráfica de evolución de tiempos
        const ctx3 = document.getElementById('progressTimeChart');
        if (ctx3) {
            const datasets = [];

            if (espacialVersions.length > 1) {
                datasets.push({
                    label: 'Espacial',
                    data: espacialVersions.map(v => v.tiempoUsado),
                    borderColor: '#4f46e5',
                    backgroundColor: 'rgba(79, 70, 229, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#ffffff',
                    pointBorderColor: '#4f46e5',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                });
            }

            if (memoriaVersions.length > 1) {
                datasets.push({
                    label: 'Memoria',
                    data: memoriaVersions.map(v => v.tiempoUsado),
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#ffffff',
                    pointBorderColor: '#10b981',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                });
            }

            if (orientacionVersions.length > 1) {
                datasets.push({
                    label: 'Orientación',
                    data: orientacionVersions.map(v => v.tiempoUsado),
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#ffffff',
                    pointBorderColor: '#f59e0b',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                });
            }

            if (rompecabezasVersions.length > 1) {
                datasets.push({
                    label: 'Rompecabezas',
                    data: rompecabezasVersions.map(v => v.tiempoUsado),
                    borderColor: '#d946ef',
                    backgroundColor: 'rgba(217, 70, 239, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#ffffff',
                    pointBorderColor: '#d946ef',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                });
            }

            const chart3 = new Chart(ctx3.getContext('2d'), {
                type: 'line',
                data: {
                    labels: versionLabels,
                    datasets: datasets
                },
                options: {
                    ...commonLineOptions,
                    plugins: {
                        ...commonLineOptions.plugins,
                        title: {
                            display: true,
                            text: 'Evolución del tiempo (segundos) - Menor es mejor',
                            font: { size: 14, weight: 'bold' },
                            padding: { bottom: 20 }
                        }
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
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#ffffff',
                    pointBorderColor: '#10b981',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                });
            }

            if (orientacionVersions.length > 1) {
                datasets.push({
                    label: 'Orientación',
                    data: orientacionVersions.map(v => parseInt(v.errores)),
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#ffffff',
                    pointBorderColor: '#f59e0b',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                });
            }

            if (rompecabezasVersions.length > 1) {
                datasets.push({
                    label: 'Rompecabezas (% error)',
                    data: rompecabezasVersions.map(v => v.porcentajeError),
                    borderColor: '#d946ef',
                    backgroundColor: 'rgba(217, 70, 239, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#ffffff',
                    pointBorderColor: '#d946ef',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                });
            }

            const chart4 = new Chart(ctx4.getContext('2d'), {
                type: 'line',
                data: {
                    labels: versionLabels,
                    datasets: datasets
                },
                options: {
                    ...commonLineOptions,
                    plugins: {
                        ...commonLineOptions.plugins,
                        title: {
                            display: true,
                            text: 'Evolución de errores - Menor es mejor',
                            font: { size: 14, weight: 'bold' },
                            padding: { bottom: 20 }
                        }
                    }
                }
            });
            this.currentCharts.push(chart4);
        }
    },

    showUsersList() {
        document.getElementById('userDetail').classList.remove('active');
        document.getElementById('resultsSection').classList.add('active');
    }
};

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => app.init());