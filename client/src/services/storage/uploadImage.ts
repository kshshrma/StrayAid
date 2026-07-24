import { supabase } from "../../lib/supabase";

export async function uploadImage(image: File): Promise<string> {
  const fileName = `${Date.now()}-${image.name}`;

  const { error } = await supabase.storage
    .from("animal-images")
    .upload(fileName, image);

  if (error) {
    throw error;
  }

  const { data } = supabase.storage
    .from("animal-images")
    .getPublicUrl(fileName);

  return data.publicUrl;
}