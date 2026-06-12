import { draftMode } from "next/headers";
import { redirect } from "next/navigation";

/** Exit Visual Editor preview — clears Next draft mode (spec 011). */
export async function GET(): Promise<Response> {
  (await draftMode()).disable();
  redirect("/");
}
