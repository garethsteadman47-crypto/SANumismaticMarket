"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";
import { TAXONOMY_TREE } from "@/lib/numismatic-taxonomy";
import { serializeBrowseFilters, parseBrowseFilters } from "@/lib/browse-filters";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { TaxonomyIcon } from "@/components/browse/TaxonomyIcon";

/**
 * Collapsible category navigation for the unified `/listings` marketplace.
 * Updates `taxonomy` + `category` URL params while preserving tab (`format`),
 * search (`q`), and sort — so switching Union → Farthings on Live Auctions
 * never drops the auction mode.
 */
export function CategoryTree({ basePath }: { basePath: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentFilters = parseBrowseFilters(Object.fromEntries(searchParams.entries()));
  const selectedId = currentFilters.taxonomy;

  function selectNode(nodeId: string) {
    const isDeselecting = selectedId === nodeId;
    const nextTaxonomy = isDeselecting ? undefined : nodeId;
    const query = serializeBrowseFilters({
      ...currentFilters,
      taxonomy: nextTaxonomy,
    });
    // Dual-write `category=` for deep-link / marketing parity with taxonomy.
    const params = new URLSearchParams(query);
    if (nextTaxonomy) {
      params.set("category", nextTaxonomy);
      params.set("taxonomy", nextTaxonomy);
    } else {
      params.delete("category");
      params.delete("taxonomy");
    }
    const qs = params.toString();
    router.replace(qs ? `${basePath}?${qs}` : basePath, { scroll: false });
  }

  return (
    <div className="flex flex-col gap-1">
      <h3 className="px-1 text-sm font-semibold">Categories</h3>
      <Accordion multiple>
        {TAXONOMY_TREE.map((parent) => (
          <AccordionItem key={parent.id} value={parent.id}>
            <AccordionTrigger
              onClick={() => selectNode(parent.id)}
              className={cn("text-sm", selectedId === parent.id && "font-semibold text-primary")}
            >
              <span className="flex items-center gap-2 text-left">
                <TaxonomyIcon name={parent.icon} className={selectedId === parent.id ? "text-primary" : undefined} />
                {parent.label}
              </span>
            </AccordionTrigger>
            {parent.children && parent.children.length > 0 && (
              <AccordionContent>
                <div className="flex flex-col gap-0.5 pl-4">
                  {parent.children.map((child) => (
                    <button
                      key={child.id}
                      type="button"
                      onClick={() => selectNode(child.id)}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                        selectedId === child.id && "bg-primary/10 font-medium text-primary",
                      )}
                    >
                      <TaxonomyIcon
                        name={child.icon}
                        className={selectedId === child.id ? "text-primary" : undefined}
                      />
                      {child.label}
                    </button>
                  ))}
                </div>
              </AccordionContent>
            )}
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
