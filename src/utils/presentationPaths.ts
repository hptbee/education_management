export const PRESENTATION_PATHS = ["/rewards", "/ranking", "/recognition", "/tools", "/seating-chart"] as const;

export function isPresentationPath(pathname: string): boolean {
  return PRESENTATION_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}
