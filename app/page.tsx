import { Navbar } from "@/components/site/Navbar";
import { Hero } from "@/components/hero/Hero";
import { Mission } from "@/components/sections/Mission";
import { Products } from "@/components/sections/Products";
import { Careers } from "@/components/sections/Careers";
import { Contact } from "@/components/sections/Contact";
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
  makesOffer: PRODUCTS.map((p) => ({
    "@type": "Offer",
    itemOffered: { "@type": "SoftwareApplication", name: p.name, description: p.description, applicationCategory: "LifestyleApplication" },
  })),
};

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Navbar />
      <main id="main">
        <Hero />
        <Mission />
        <Products />
        <Careers />
        <Contact />
      </main>
    </>
  );
}
