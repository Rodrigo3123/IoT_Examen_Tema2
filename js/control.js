// js/control.js
import * as api from './apiService.js';
import * as socket from './socketService.js';

// --- NUEVA FUNCIÓN HELPER ---
// Crea una promesa que se resuelve después de 'ms' milisegundos
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

document.addEventListener('DOMContentLoaded', () => {
    // --- Selectores del DOM ---
    const deviceIdInput = document.getElementById('device-id-input');
    const movementButtons = document.querySelectorAll('.control-button');
    const movementStatus = document.getElementById('movement-status');
    const demoSelect = document.getElementById('demo-select');
    const runDemoBtn = document.getElementById('run-demo-btn');
    const demoStatus = document.getElementById('demo-status');
    const registerForm = document.getElementById('register-form');
    const createDemoForm = document.getElementById('create-demo-form');
    
    // --- NUEVOS Selectores ---
    const obstacleButtons = document.querySelectorAll('.obstacle-button');
    const obstacleStatus = document.getElementById('obstacle-status');

    // --- Cargar ID de dispositivo guardado ---
    deviceIdInput.value = localStorage.getItem('iot_device_id') || 1;
    deviceIdInput.addEventListener('change', () => {
        localStorage.setItem('iot_device_id', deviceIdInput.value);
    });
    
    const getDeviceId = () => parseInt(deviceIdInput.value);

    // --- Cargar Demos ---
    async function loadDemos() {
        demoSelect.innerHTML = '<option value="">Cargando...</option>';
        demoSelect.setAttribute('aria-busy', 'true');
        const demos = await api.getDemos();
        demoSelect.innerHTML = '';
        if (demos && demos.length > 0) {
            demos.forEach(demo => {
                const option = new Option(`${demo.id_demo}: ${demo.nombre_demo}`, demo.id_demo);
                demoSelect.add(option);
            });
        } else {
            demoSelect.innerHTML = '<option value="">No hay demos</option>';
        }
        demoSelect.removeAttribute('aria-busy');
    }
    loadDemos();

    // --- Función para ejecutar secuencia ---
    async function executeDemoSequence(devId, steps) {
        // Deshabilitar botones para evitar clics múltiples
        runDemoBtn.disabled = true;
        runDemoBtn.setAttribute('aria-busy', 'true');
        
        for (const step of steps) {
            const stepName = step.nombre_operacion || `ID: ${step.id_operacion}`;
            
            // 1. Actualizar el estado en el UI
            demoStatus.textContent = `Paso ${step.numero_paso}/${steps.length}: ${stepName}`;
            movementStatus.textContent = `Ejecutando: ${stepName}`;

            // 2. Registrar el movimiento en la base de datos (simula la ejecución)
            await api.addMovement(devId, step.id_operacion);
            
            // 3. Esperar 1 segundo (1000ms)
            await delay(1000);
        }
        
        // 4. Finalizar
        demoStatus.textContent = `Demo completada (${steps.length} pasos).`;
        movementStatus.textContent = 'Estado: Listo';
        runDemoBtn.disabled = false;
        runDemoBtn.removeAttribute('aria-busy');
    }

    // --- Event Listeners ---

    // 1. Botones de Movimiento
    movementButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const opId = parseInt(button.dataset.opId);
            const devId = getDeviceId();
            movementStatus.textContent = `Enviando Op: ${opId}...`;
            const result = await api.addMovement(devId, opId);
            if (result) {
                movementStatus.textContent = `Éxito: Movimiento ${opId} registrado.`;
            } else {
                movementStatus.textContent = 'Error al enviar movimiento.';
            }
        });
    });

    // 2. Ejecutar Demo
    runDemoBtn.addEventListener('click', async () => {
        const demoId = parseInt(demoSelect.value);
        const devId = getDeviceId();
        if (!demoId) {
            alert('Por favor, selecciona una demo.');
            return;
        }
        demoStatus.textContent = `Iniciando Demo ${demoId}...`;
        
        // La API 'runDemo' registra el INICIO de la demo y devuelve los pasos
        const steps = await api.runDemo(devId, demoId); 
        
        if (steps && steps.length > 0) {
            // Llamamos a la nueva función que ejecuta los pasos con delay
            await executeDemoSequence(devId, steps);
        } else {
            demoStatus.textContent = 'Error: No se pudieron obtener los pasos de la demo.';
        }
    });

    // 3. Registrar Dispositivo
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nombre = document.getElementById('reg-nombre').value;
        const ip = document.getElementById('reg-ip').value;
        const pais = document.getElementById('reg-pais').value;
        const ciudad = document.getElementById('reg-ciudad').value;

        const result = await api.registerDevice(nombre, ip, pais, ciudad, null, null);
        if (result && result.id_nuevo_dispositivo) {
            alert(`Dispositivo registrado con éxito. Nuevo ID: ${result.id_nuevo_dispositivo}`);
            deviceIdInput.value = result.id_nuevo_dispositivo;
            localStorage.setItem('iot_device_id', deviceIdInput.value);
            registerForm.reset();
        } else {
            alert('Error al registrar dispositivo.');
        }
    });

    // 4. Crear Nueva Demo
    createDemoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nombre = document.getElementById('demo-nombre').value;
        const secuencia = document.getElementById('demo-secuencia').value;

        if (!nombre || !secuencia) {
            alert('Debes completar el nombre y la secuencia.');
            return;
        }

        demoStatus.textContent = `Creando demo "${nombre}"...`;
        const result = await api.addDemo(nombre, secuencia);
        
        if (result && result[0].id_nuevo_demo) {
            alert(`¡Demo creada con éxito! ID: ${result[0].id_nuevo_demo}`);
            demoStatus.textContent = 'Demo creada. Actualizando lista...';
            createDemoForm.reset();
            
            // Recarga la lista de demos en el dropdown
            await loadDemos(); 
            demoStatus.textContent = 'Estado: Listo';
        } else {
            alert('Error al crear la demo.');
            demoStatus.textContent = 'Error al crear demo.';
        }
    });
    
    // --- NUEVO Event Listener ---
    // 5. Botones de Obstáculo
    obstacleButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const obsId = parseInt(button.dataset.obsId);
            const devId = getDeviceId();
            obstacleStatus.textContent = `Enviando Obstáculo: ${obsId}...`;
            const result = await api.addObstacle(devId, obsId);
            if (result) {
                obstacleStatus.textContent = `Éxito: Obstáculo ${obsId} registrado.`;
            } else {
                obstacleStatus.textContent = 'Error al enviar obstáculo.';
            }
        });
    });

    // --- Escuchar eventos PUSH ---
    // Actualiza la lista de demos si alguien más crea una
    socket.onNewDemo(() => {
        console.log('Nueva demo detectada, recargando lista...');
        loadDemos();
    });
});