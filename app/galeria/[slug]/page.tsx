import { ClientGallery } from "@/components/gallery/ClientGallery";

export const dynamic = "force-dynamic";

export default async function GalleryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ClientGallery slug={slug} />;
}
