// =============================================================
// JSON-LD Structured Data Components
// Helps search engines understand content for rich results
// =============================================================

import type { AgentListItem } from "@/types";

interface WebSiteJsonLdProps {
  url: string;
  name: string;
  description: string;
}

export function WebSiteJsonLd({ url, name, description }: WebSiteJsonLdProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name,
    url,
    description,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${url}/agents?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface OrganizationJsonLdProps {
  url: string;
  name: string;
  description: string;
}

export function OrganizationJsonLd({ url, name, description }: OrganizationJsonLdProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name,
    url,
    description,
    sameAs: [],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      availableLanguage: ["English"],
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface SoftwareAppJsonLdProps {
  agent: AgentListItem;
  url: string;
}

export function SoftwareAppJsonLd({ agent, url }: SoftwareAppJsonLdProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: agent.name,
    description: agent.description,
    url: `${url}/agents/${agent.slug}`,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: agent.priceInCents / 100,
      priceCurrency: "ZAR",
      availability: "https://schema.org/InStock",
    },
    aggregateRating:
      agent.averageRating > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: agent.averageRating,
            bestRating: 5,
            worstRating: 1,
          }
        : undefined,
    author: {
      "@type": "Person",
      name: [agent.developer.firstName, agent.developer.lastName]
        .filter(Boolean)
        .join(" "),
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
