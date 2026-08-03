"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { TAXONOMY_TREE } from "@/lib/numismatic-taxonomy";
import { serializeBrowseFilters, parseBrowseFilters } from "@/lib/browse-filters";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

/**
 * Collapsible, multi-level category navigation for `/listings`. Selecting a
 * parent or child both applies that node's filter AND expands/collapses its
 * section — a single click does both, which is the natural expectation for
 * a browse tree (vs. requiring a separate chevron-only toggle).
 */
export function CategoryTree({ basePath }: { basePath: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentFilters = parseBrowseFilters(Object.fromEntries(searchParams.entries()));
  const selectedId = currentFilters.taxonomy;

  function selectNode(nodeId: string) {
    const isDeselecting = selectedId === nodeId;
    const query = serializeBrowseFilters({ ...currentFilters, taxonomy: isDeselecting ? undefined : nodeId });
    router.push(query ? `${basePath}?${query}` : basePath, { scroll: false });
  }

  return (
    <div className="flex flex-col gap-1">
      <h3 className="px-1 text-sm font-semibold">Categories</h3>
      <Accordion multiple>
        {TAXONOMY_TREE.map((parent) => (
          <AccordionItem key={parent.id} value={parent.id}>
            <AccordionTrigger
              onClick={() => selectNode(parent.id)}
              className={cn(
                "text-sm",
                selectedId === parent.id && "font-semibold text-primary"
              )}
            >
              <span className="flex items-center gap-1.5">
                <span aria-hidden>{parent.emoji}</span>
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
                        "rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                        selectedId === child.id && "bg-primary/10 font-medium text-primary"
                      )}
                    >
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
