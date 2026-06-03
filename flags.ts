import { flag } from 'flags/next';

export const exampleFlag = flag({
  key: 'example-flag',
  description: 'Una funcionalidad de prueba controlada por Vercel Flags',
  decide() {
    return false; // Valor por defecto localmente si no hay conexión a Edge Config
  },
});
