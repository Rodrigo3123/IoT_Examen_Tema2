// js/config.js

// 🔴 ¡IMPORTANTE! 🔴
// Reemplaza esta IP con la IP pública de tu instancia EC2.
const EC2_PUBLIC_IP = '54.226.224.183'; // Ej: '34.207.118.99'

// Asegúrate de que tu backend EC2 esté corriendo en el puerto 5500
export const API_BASE_URL = 'https://micarrirobot.cc/api';
export const SOCKET_URL = 'https://micarrirobot.cc';

// --- NUEVOS MAPAS DE REFERENCIA ---

// Mapa para traducir IDs de Movimiento
export const MOVEMENT_MAP = {
    1: 'Adelante',
    2: 'Atrás',
    3: 'Detener',
    4: 'Vuelta adelante derecha',
    5: 'Vuelta adelante izquierda',
    6: 'Vuelta atrás derecha',
    7: 'Vuelta atrás izquierda',
    8: 'Giro 90° derecha',
    9: 'Giro 90° izquierda',
    10: 'Giro 360° derecha',
    11: 'Giro 360° izquierda'
};

// Mapa para traducir IDs de Obstáculos
export const OBSTACLE_MAP = {
    1: 'Adelante',
    2: 'Adelante-Izquierda',
    3: 'Adelante-Derecha',
    4: 'Adelante-Izquierda-Derecha',
    5: 'Retrocede'

};
