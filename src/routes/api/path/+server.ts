import type { RequestHandler } from './$types';
import { decompressPath, generateBucketPathFilename } from '$lib/utils/compression';
import { PATH_UPLOAD_BUCKET } from '$env/static/private';
import { PUBLIC_DEFAULT_KICKTABLE, PUBLIC_DEFAULT_HOLDTYPE } from '$env/static/public';
import { error } from '@sveltejs/kit';
import { isSetupID } from '$lib/utils/id';
import type { SetupID, Kicktable, HoldType } from '$lib/types';

export const GET: RequestHandler = async ({ url, locals: { supabase } }) => {
  const setupid = url.searchParams.get('setupid') || null;
  const kicktable = url.searchParams.get('kicktable') || PUBLIC_DEFAULT_KICKTABLE;
  const holdtype = url.searchParams.get('holdtype') || PUBLIC_DEFAULT_HOLDTYPE;
  const level = Number(url.searchParams.get('level') || '4');

  if (setupid === null) {
    throw error(400, "Missing setupid");
  }

  if (!isSetupID(setupid)) {
    throw error(400, "Invalid setupid");
  }

  const bucketFilename = generateBucketPathFilename(setupid as SetupID, kicktable as Kicktable, holdtype as HoldType);

  const { data: fileExists, error: existError } = await supabase.storage.from(PATH_UPLOAD_BUCKET).exists(bucketFilename);

  if (existError) {
    console.error("Failed to determine existance of file:", existError)
    throw error(500, "Failed to determine existance of file");
  }

  if (!fileExists) {
    throw error(400, "File does not exist");
  }

  const { data, error: downloadError } = await supabase.storage.from(PATH_UPLOAD_BUCKET).download(bucketFilename);

  if (downloadError) {
    console.error("Failed to determine existance of file:", downloadError.message)
    throw error(500, "Failed to determine existance of file");
  }

  // decompress the file
  const { data: decompressedData, error: decompressError } = await decompressPath(Buffer.from(await data.arrayBuffer()), level);

   if (decompressError) {
    console.error("Failed to decompress path file:", decompressError.message)
    throw error(500, "Failed to decompress path file");
  }

  return new Response(decompressedData, {
    headers: { "Content-Type": "text/csv" }
  });
};
