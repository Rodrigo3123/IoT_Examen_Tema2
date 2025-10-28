// js/monitor.js
import * as api from './apiService.js';
import * as socket from './socketService.js';
import { MOVEMENT_MAP, OBSTACLE_MAP } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- Selectores del DOM ---
    const movementLog = document.getElementById('movement-log');
    const obstacleLog = document.getElementById('obstacle-log');
    const demoList = document.getElementById('demo-list');
    const deviceIdSpan = document.getElementById('monitor-device-id');
    
    // --- NUEVOS Selectores ---
    const monitorForm = document.getElementById('monitor-form');
    const monitorDeviceInput = document.getElementById('monitor-device-input');
    
    // --- CAMBIO: 'const' a 'let' ---
    // Obtenemos el ID del dispositivo guardado en la otra página
    let currentDeviceId = localStorage.getItem('iot_device_id') || 1;
    
    // Seteamos el estado inicial
    deviceIdSpan.textContent = currentDeviceId;
    monitorDeviceInput.value = currentDeviceId;

    // --- Funciones para pintar el DOM ---
    function addLogEntry(listElement, text, isLive = false) {
        const li = document.createElement('li');
        li.textContent = text;
        if (isLive) {
            li.classList.add('live-update');
        }
        listElement.prepend(li); // Añade al principio
    }

    // --- Carga Inicial de Datos (Usando Fetch) ---

    // 1. Cargar Historial de Movimientos
    async function loadMovementHistory() {
        movementLog.innerHTML = '';
        movementLog.setAttribute('aria-busy', 'true');
        // --- CAMBIO: Usa la variable 'currentDeviceId' ---
        const history = await api.getMovementHistory(currentDeviceId);
        movementLog.removeAttribute('aria-busy');
        if (history && history.length > 0) {
            history.forEach(log => {
                addLogEntry(movementLog, `[${new Date(log.fecha_hora).toLocaleTimeString()}] ${log.nombre_operacion}`);
            });
        } else {
            addLogEntry(movementLog, 'No hay historial de movimientos.');
        }
    }

    // 2. Cargar Historial de Obstáculos
    async function loadObstacleHistory() {
        obstacleLog.innerHTML = '';
        obstacleLog.setAttribute('aria-busy', 'true');
        // --- CAMBIO: Usa la variable 'currentDeviceId' ---
        const history = await api.getObstacleHistory(currentDeviceId);
        obstacleLog.removeAttribute('aria-busy');
        if (history && history.length > 0) {
            history.forEach(log => {
                addLogEntry(obstacleLog, `[${new Date(log.fecha_hora).toLocaleTimeString()}] ${log.nombre_obstaculo}`);
            });
        } else {
            addLogEntry(obstacleLog, 'No hay historial de obstáculos.');
        }
    }

    // 3. Cargar Lista de Demos
    async function loadDemos() {
        demoList.innerHTML = '';
        demoList.setAttribute('aria-busy', 'true');
        const demos = await api.getDemos();
        demoList.removeAttribute('aria-busy');
        if (demos && demos.length > 0) {
            demos.forEach(demo => {
                const li = document.createElement('li');
                li.innerHTML = `<strong>${demo.id_demo}: ${demo.nombre_demo}</strong><br><small>${demo.secuencia}</small>`;
                demoList.appendChild(li);
            });
        } else {
            demoList.innerHTML = '<li>No hay demos disponibles.</li>';
        }
    }
    
    // --- NUEVO Event Listener para el formulario de monitoreo ---
    monitorForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newDeviceId = parseInt(monitorDeviceInput.value);
        if (!newDeviceId || newDeviceId < 1) {
            alert('Por favor, ingresa un ID de dispositivo válido.');
            return;
        }

        // 1. Actualizar la variable global
        currentDeviceId = newDeviceId;
        
        // 2. Actualizar el UI
        deviceIdSpan.textContent = currentDeviceId;
        
        // 3. Guardar en localStorage para que la página de Control también se actualice
        localStorage.setItem('iot_device_id', currentDeviceId);
        
        // 4. Recargar los logs para el nuevo dispositivo
        loadMovementHistory();
        loadObstacleHistory();
        
        console.log(`Cambiado a monitorear Dispositivo ID: ${currentDeviceId}`);
    });

    // --- Escuchar Eventos PUSH (Usando Socket.IO) ---
    
    // 1. Escuchar Nuevos Movimientos
    socket.onNewMovement((data) => {
        console.log('PUSH (new_movement):', data);
        // --- CAMBIO: Usa la variable 'currentDeviceId' ---
        if (data.device_id == currentDeviceId) {
            const opId = data.operation_id;
            const opName = MOVEMENT_MAP[opId] || `ID Desconocido (${opId})`;
            addLogEntry(movementLog, `[${new Date().toLocaleTimeString()}] (PUSH) ${opName}`, true);
        }
    });

    // 2. Escuchar Nuevos Obstáculos
    socket.onNewObstacle((data) => {
        console.log('PUSH (new_obstacle):', data);
        // --- CAMBIO: Usa la variable 'currentDeviceId' ---
        if (data.device_id == currentDeviceId) {
            const obsId = data.obstacle_id;
            const obsName = OBSTACLE_MAP[obsId] || `ID Desconocido (${obsId})`;
            addLogEntry(obstacleLog, `[${new Date().toLocaleTimeString()}] (PUSH) ${obsName}`, true);
        }
    });

    // 3. Escuchar Creación de Demos
    socket.onNewDemo((data) => {
        console.log('PUSH (new_demo_created):', data);
        addLogEntry(demoList, `(PUSH) Nueva Demo Creada: ${data.nombre}`, true);
        // Recarga la lista de demos automáticamente
        loadDemos();
    });

    // --- Iniciar Carga ---
    loadMovementHistory();
    loadObstacleHistory();
    loadDemos();
});