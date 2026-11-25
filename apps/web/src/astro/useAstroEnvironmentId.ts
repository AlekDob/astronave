import { useScratchProject } from "~/hooks/useScratchProject";

/** Astro lives where project-less chats run: the primary (local) environment when it can. */
export function useAstroEnvironmentId() {
  return useScratchProject().scratchEnvironmentId(null);
}
