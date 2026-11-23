import { Navbar } from "@/components/site/Navbar";
import { SmoothScroll } from "@/components/site/SmoothScroll";
import { Hero } from "@/components/hero/Hero";
import { ProductsOrbit } from "@/components/sections/ProductsOrbit";
import { Services } from "@/components/sections/Services";
import { About } from "@/components/sections/About";
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
      <SmoothScroll />
      <Navbar />
      <main id="main">
        <Hero />
        <ProductsOrbit />
        <Services />
        <About />
        <Careers />
        <Contact />
      </main>
    </>
  );
}
