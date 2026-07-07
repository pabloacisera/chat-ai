function requireEnv(name: string): string {
  const value = process.env[name];
  if (
    !value ||
    value.startsWith('tu_') ||
    value === 'default_secret_key_32_chars_minimum' ||
    value === 'default_32_char_encryption_key!!'
  ) {
    throw new Error(
      `Variable de entorno ${name} no configurada. ` +
        `Defínela en el archivo .env o configúrala en el entorno de despliegue.`,
    );
  }
  return value;
}

export const JWT_SECRET = requireEnv('JWT_SECRET');
export const ENCRYPTION_KEY = requireEnv('ENCRYPTION_KEY');
