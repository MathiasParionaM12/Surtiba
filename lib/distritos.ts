// Distritos donde entrega Surtiba hoy: Lima Metropolitana (43) y Callao (7).
// Las zonas y horarios de reparto siguen como decisión pendiente (docs/producto.md).

export const DISTRITOS_LIMA = [
  "Ancón", "Ate", "Barranco", "Breña", "Carabayllo", "Chaclacayo", "Chorrillos", "Cieneguilla", "Comas",
  "El Agustino", "Independencia", "Jesús María", "La Molina", "La Victoria", "Lima (Cercado)", "Lince",
  "Los Olivos", "Lurigancho (Chosica)", "Lurín", "Magdalena del Mar", "Miraflores", "Pachacámac", "Pucusana",
  "Pueblo Libre", "Puente Piedra", "Punta Hermosa", "Punta Negra", "Rímac", "San Bartolo", "San Borja",
  "San Isidro", "San Juan de Lurigancho", "San Juan de Miraflores", "San Luis", "San Martín de Porres",
  "San Miguel", "Santa Anita", "Santa María del Mar", "Santa Rosa", "Santiago de Surco", "Surquillo",
  "Villa El Salvador", "Villa María del Triunfo",
];

export const DISTRITOS_CALLAO = [
  "Bellavista", "Callao", "Carmen de la Legua Reynoso", "La Perla", "La Punta", "Mi Perú", "Ventanilla",
];

export const DISTRITOS = [...DISTRITOS_LIMA, ...DISTRITOS_CALLAO];
