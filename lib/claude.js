// Cliente de Claude para la traducción automática. Dan eligió el modelo Haiku.
// En este encargo no hay ANTHROPIC_API_KEY: clienteClaude devuelve null y nunca se llama a la API.
import Anthropic from '@anthropic-ai/sdk';

export const MODELO = 'claude-haiku-5-5';

export function clienteClaude(env) {
  return env && env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: env.ANTHROPIC_API_KEY }) : null;
}
