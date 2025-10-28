// js/apiService.js
import { API_BASE_URL } from './config.js';

// Función helper para manejar las peticiones FETCH
async function request(endpoint, method = 'GET', body = null) {
    const url = `${API_BASE_URL}${endpoint}`;
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${await response.text()}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error en la API (${endpoint}):`, error);
        alert(`Error en la API: ${error.message}`);
        return null;
    }
}

// --- API de Dispositivos ---
export async function registerDevice(nombre, ip, pais, ciudad, lat, lon) {
    return request('/device/register', 'POST', {
        nombre_dispositivo: nombre,
        ip_address: ip,
        pais: pais,
        ciudad: ciudad,
        latitud: lat,
        longitud: lon
    });
}

// --- API de Movimientos ---
export async function addMovement(deviceId, operationId) {
    return request('/device/movement', 'POST', {
        device_id: deviceId,
        operation_id: operationId
    });
}

// --- API de Obstáculos ---
export async function addObstacle(deviceId, obstacleId) {
    return request('/device/obstacle', 'POST', {
        device_id: deviceId,
        obstacle_id: obstacleId
    });
}

// --- API de Demos ---

export async function addDemo(nombre, secuencia) {
    return request('/demos', 'POST', {
        nombre_demo: nombre,
        secuencia_operaciones: secuencia
    });
}

export async function getDemos() {
    return request('/demos', 'GET');
}

export async function runDemo(deviceId, demoId) {
    return request('/demos/repeat', 'POST', {
        device_id: deviceId,
        demo_id: demoId
    });
}

// --- API de Historial (para el monitor) ---
export async function getMovementHistory(deviceId) {
    return request(`/device/${deviceId}/movements/history`, 'GET');
}

export async function getObstacleHistory(deviceId) {
    return request(`/device/${deviceId}/obstacles/history`, 'GET');
}