// js/control.js
import * as api from './apiService.js';
import * as socket from './socketService.js'; // Lo mantenemos para los logs

// --- FUNCIÓN DELAY ---
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ===================================================================
// INICIO: NUEVA SECCIÓN MQTT
// ===================================================================
console.log("Iniciando cliente MQTT...");
// Generar un ID de cliente único para la web
const clientID = "web-client-" + Math.random().toString(16).substr(2, 8);

// Conectar al broker público de HiveMQ por WebSockets (puerto 8000)
// !! NOTA: Si tuvieras problemas de conexión, podría ser porque tu
// !! servidor (https) no deja conectar a un broker (ws).
// !! Pero un broker público como HiveMQ suele funcionar.
const mqttClient = new Paho.MQTT.Client("broker.hivemq.com", 8000, clientID);

// Callback para conexión perdida
mqttClient.onConnectionLost = (responseObject) => {
  if (responseObject.errorCode !== 0) {
    console.log("MQTT Conexión perdida:", responseObject.errorMessage);
    // Intentar reconectar
    mqttClient.connect({ onSuccess: onMqttConnect, useSSL: false });
  }
};

// Callback para cuando llega un mensaje (para el monitor de obstáculos)
mqttClient.onMessageArrived = (message) => {
    console.log("MQTT Mensaje recibido:", message.payloadString);
    if(message.destinationName === "micarrirobot/obstaculos") {
        // Aquí puedes notificar al usuario
        // (La página de monitoreo hará esto)
    }
};

// Callback para conexión exitosa
function onMqttConnect() {
  console.log("MQTT Conectado a broker.hivemq.com!");
  // Suscribirse al canal de obstáculos (para el monitor)
  mqttClient.subscribe("micarrirobot/obstaculos");
}

// Conectar al broker
mqttClient.connect({ 
  onSuccess: onMqttConnect,
  useSSL: false // Usamos WebSocket (puerto 8000), no WSS
});

// Función para ENVIAR comandos MQTT al carro
function sendMqttCommand(operationId) {
  if (!mqttClient.isConnected()) {
    console.warn("MQTT no conectado, no se puede enviar comando.");
    alert("No se pudo enviar el comando: MQTT no conectado. Refresca la página.");
    return;
  }
  // El mensaje es solo el ID del movimiento
  const message = new Paho.MQTT.Message(String(operationId));
  message.destinationName = "micarrirobot/comandos"; // El canal que el carro escucha
  mqttClient.send(message);
  console.log(`Comando MQTT enviado: ${operationId}`);
}
// ===================================================================
// FIN: NUEVA SECCIÓN MQTT
// ===================================================================


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

    // --- Función para ejecutar secuencia (MODIFICADA) ---
    async function executeDemoSequence(devId, steps) {
        runDemoBtn.disabled = true;
        runDemoBtn.setAttribute('aria-busy', 'true');
        
        for (const step of steps) {
            const stepName = step.nombre_operacion || `ID: ${step.id_operacion}`;
            demoStatus.textContent = `Paso ${step.numero_paso}/${steps.length}: ${stepName}`;
            movementStatus.textContent = `Ejecutando: ${stepName}`;

            // --- ¡CAMBIO AQUÍ! ---
            // 1. Enviar comando instantáneo por MQTT
            sendMqttCommand(step.id_operacion);
            
            // 2. Registrar el movimiento en la BD (para el log)
            await api.addMovement(devId, step.id_operacion);
            
            // 3. Esperar 1 segundo (1000ms)
            await delay(1000);
        }
        
        demoStatus.textContent = `Demo completada (${steps.length} pasos).`;
        movementStatus.textContent = 'Estado: Listo';
        runDemoBtn.disabled = false;
        runDemoBtn.removeAttribute('aria-busy');
    }

    // --- Event Listeners ---

    // 1. Botones de Movimiento (MODIFICADO)
    movementButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const opId = parseInt(button.dataset.opId);
            const devId = getDeviceId();
            movementStatus.textContent = `Enviando Op: ${opId}...`;
            
            // --- ¡CAMBIO AQUÍ! ---
            // 1. Enviar comando instantáneo por MQTT
            sendMqttCommand(opId);
            
            // 2. Registrar el movimiento en la BD (para el log)
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
        
        const steps = await api.runDemo(devId, demoId); 
        
        if (steps && steps.length > 0) {
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
            
            await loadDemos(); 
            demoStatus.textContent = 'Estado: Listo';
        } else {
            alert('Error al crear la demo.');
            demoStatus.textContent = 'Error al crear demo.';
        }
    });
    
    // 5. Botones de Obstáculo (Sin cambios, solo loguea)
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

    // --- Escuchar eventos PUSH (del Socket.IO del Backend, para el log) ---
    socket.onNewDemo(() => {
        console.log('Socket.IO: Nueva demo detectada, recargando lista...');
        loadDemos();
    });
});
