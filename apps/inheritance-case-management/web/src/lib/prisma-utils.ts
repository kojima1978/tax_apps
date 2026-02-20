export function isPrismaNotFound(e: unknown): boolean {
  return e instanceof Error && e.name === 'PrismaClientKnownRequestError' && (e as { code?: string }).code === 'P2025';
}
