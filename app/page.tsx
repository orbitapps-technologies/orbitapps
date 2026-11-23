import { SpaceApp } from "@/components/space/SpaceApp";
import { SITE } from "@/lib/site";
import { PRODUCTS } from "@/lib/products";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE.name,
  url: SITE.url,
  email: SITE.email,
  address: {
    "@type": "PostalAddress",
    streetAddress: SITE.address.lines.slice(0, 3).join(", "),
    addressLocality: "Bengaluru",
    addressRegion: "Karnataka",
    postalCode: "560095",
    addressCountry: "IN",
  },
  owns: PRODUCTS.map((p) => ({
    "@type": "SoftwareApplication",
    name: p.name,
    description: p.description,
    applicationCategory: "LifestyleApplication",
  })),
};

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SpaceApp />
    </>
  );
}
