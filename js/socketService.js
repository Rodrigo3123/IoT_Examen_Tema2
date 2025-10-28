// js/socketService.js
import { SOCKET_URL } from './config.js';

// Necesitas cargar la librería cliente de Socket.IO en tu HTML
// <script src="https://cdnjs.cloudflare.com/ajax/libs/socket.io/4.7.5/socket.io.js"></script>

// Inicializa la conexión
const socket = io(SOCKET_URL);

socket.on('connect', () => {
    console.log('Conectado al servidor WebSocket:', socket.id);
});

socket.on('response', (data) => {
    console.log('Respuesta del servidor:', data);
});

socket.on('disconnect', () => {
    console.log('Desconectado del servidor WebSocket');
});

socket.on('connect_error', (err) => {
    console.error('Error de conexión con WebSocket:', err);
});

// --- Funciones para que otros módulos escuchen ---

export function onNewMovement(callback) {
    socket.on('new_movement', callback);
}

export function onNewObstacle(callback) {
    socket.on('new_obstacle', callback);
}

export function onNewDemo(callback) {
    socket.on('new_demo_created', callback);
}

export function onDemoSteps(callback) {
    socket.on('demo_steps', callback);
}