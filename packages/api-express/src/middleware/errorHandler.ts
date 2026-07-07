export default function errorHandler(err, req, res, next) {
  console.error('Error:', err.message);
  
  if (err.message.includes('required') || err.message.includes('inválido') || err.message.includes('no encontrado')) {
    return res.status(400).json({ error: err.message });
  }
  
  if (err.message.includes('Token') || err.message.includes('credenciales')) {
    return res.status(401).json({ error: err.message });
  }

  res.status(500).json({ error: 'Error interno del servidor' });
}