import { redirect } from "next/navigation";

/**
 * /dashboard/gridia → /dashboard/briefing
 *
 * "GridIA" is the user-facing label for the Briefing module.
 * This redirect ensures that if someone navigates directly to /dashboard/gridia,
 * they land on the correct page.
 */
export default function GridiaRedirect() {
  redirect("/dashboard/briefing");
}
