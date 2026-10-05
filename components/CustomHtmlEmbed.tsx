import React from "react";
import { SiteSettingsRecord, CustomCodeSnippet } from "@/lib/analytics/types";

function parseAttributes(attrString: string): Record<string, any> {
  const attrs: Record<string, any> = {};
  const regex = /([a-zA-Z0-9_\-:]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(attrString)) !== null) {
    const name = match[1].toLowerCase();
    const val = match[2] ?? match[3] ?? match[4] ?? true;
    if (name === "class") attrs.className = val;
    else if (name === "http-equiv") attrs.httpEquiv = val;
    else if (name === "charset") attrs.charSet = val;
    else attrs[name] = val;
  }
  return attrs;
}

export function parseHeadSnippet(rawSnippet?: string, keyPrefix = "head"): React.ReactNode[] {
  if (!rawSnippet || !rawSnippet.trim()) return [];
  const trimmed = rawSnippet.trim();

  // Strip HTML comments
  const withoutComments = trimmed.replace(/<!--[\s\S]*?-->/g, "").trim();
  if (!withoutComments) return [];

  // If pure JavaScript without HTML tags (e.g. user pasted raw js code)
  if (!withoutComments.includes("<") && !withoutComments.includes(">")) {
    return [
      <script
        key={`${keyPrefix}-raw-js`}
        dangerouslySetInnerHTML={{ __html: withoutComments }}
      />,
    ];
  }

  const nodes: React.ReactNode[] = [];
  let key = 0;

  // 1. Script tags: <script ...>...</script> OR <script ... />
  const scriptRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>|<script\b([^>]*)\/>/gi;
  let scriptMatch: RegExpExecArray | null;
  while ((scriptMatch = scriptRegex.exec(withoutComments)) !== null) {
    const attrStr = scriptMatch[1] ?? scriptMatch[3] ?? "";
    const innerCode = scriptMatch[2] ?? "";
    const attrs = parseAttributes(attrStr);
    const scriptProps: any = { key: `${keyPrefix}-script-${key++}` };
    if (attrs.src) scriptProps.src = attrs.src;
    if (attrs.async) scriptProps.async = true;
    if (attrs.defer) scriptProps.defer = true;
    if (attrs.type) scriptProps.type = attrs.type;
    if (attrs.id) scriptProps.id = attrs.id;
    if (innerCode.trim()) {
      scriptProps.dangerouslySetInnerHTML = { __html: innerCode };
    }
    nodes.push(<script {...scriptProps} />);
  }

  // 2. Noscript tags: <noscript ...>...</noscript>
  const noscriptRegex = /<noscript\b([^>]*)>([\s\S]*?)<\/noscript>/gi;
  let noscriptMatch: RegExpExecArray | null;
  while ((noscriptMatch = noscriptRegex.exec(withoutComments)) !== null) {
    const innerHtml = noscriptMatch[2] ?? "";
    nodes.push(
      <noscript
        key={`${keyPrefix}-noscript-${key++}`}
        dangerouslySetInnerHTML={{ __html: innerHtml }}
      />
    );
  }

  // 3. Meta tags: <meta ... /?>
  const metaRegex = /<meta\b([^>]*)\/?>/gi;
  let metaMatch: RegExpExecArray | null;
  while ((metaMatch = metaRegex.exec(withoutComments)) !== null) {
    const attrs = parseAttributes(metaMatch[1] || "");
    nodes.push(<meta key={`${keyPrefix}-meta-${key++}`} {...attrs} />);
  }

  // 4. Link tags: <link ... /?>
  const linkRegex = /<link\b([^>]*)\/?>/gi;
  let linkMatch: RegExpExecArray | null;
  while ((linkMatch = linkRegex.exec(withoutComments)) !== null) {
    const attrs = parseAttributes(linkMatch[1] || "");
    nodes.push(<link key={`${keyPrefix}-link-${key++}`} {...attrs} />);
  }

  // 5. Style tags: <style ...>...</style>
  const styleRegex = /<style\b([^>]*)>([\s\S]*?)<\/style>/gi;
  let styleMatch: RegExpExecArray | null;
  while ((styleMatch = styleRegex.exec(withoutComments)) !== null) {
    const attrs = parseAttributes(styleMatch[1] || "");
    const innerCss = styleMatch[2] ?? "";
    nodes.push(
      <style
        key={`${keyPrefix}-style-${key++}`}
        dangerouslySetInnerHTML={{ __html: innerCss }}
        {...attrs}
      />
    );
  }

  return nodes;
}

function getCanonicalGtmHeadCode(gtmId: string): string {
  const cleanId = gtmId.trim().toUpperCase();
  return `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${cleanId}');`;
}

/**
 * CustomHeadEmbed:
 * Injects Google Tag Manager (GTM) Head snippet, custom head scripts, and dynamic CustomCodeSnippets (placement='head')
 * directly into <head> during Server-Side Rendering (SSR).
 */
export function CustomHeadEmbed({
  settings,
  snippets = [],
}: {
  settings?: SiteSettingsRecord;
  snippets?: CustomCodeSnippet[];
}) {
  // 1. Google Tag Manager Head Code
  let gtmHeadNodes: React.ReactNode[] = [];
  if (settings?.gtmHeadScript && settings.gtmHeadScript.trim()) {
    gtmHeadNodes = parseHeadSnippet(settings.gtmHeadScript, "gtm-custom-head");
    if (gtmHeadNodes.length === 0) {
      gtmHeadNodes = [
        <script
          key="gtm-custom-head-fallback"
          id="gtm-custom-head"
          dangerouslySetInnerHTML={{ __html: settings.gtmHeadScript }}
        />,
      ];
    }
  } else if (settings?.gtmId && settings.gtmId.trim()) {
    gtmHeadNodes = [
      <script
        key="gtm-canonical-head"
        id="gtm-canonical-script"
        dangerouslySetInnerHTML={{ __html: getCanonicalGtmHeadCode(settings.gtmId) }}
      />,
    ];
  }

  // 2. Legacy Custom Head Scripts
  const customHeadNodes = settings?.customHeadScript && settings.customHeadScript.trim()
    ? parseHeadSnippet(settings.customHeadScript, "custom-head")
    : [];

  // 3. Dynamic Code Snippets in HEAD
  const activeHeadSnippets = Array.isArray(snippets)
    ? snippets.filter((s) => s.isActive && (s.placement === "head" || !s.placement))
    : [];

  const dynamicHeadNodes = activeHeadSnippets.flatMap((s) => {
    if (!s.code || !s.code.trim()) return [];
    const parsed = parseHeadSnippet(s.code, `head-snip-${s.id}`);
    if (parsed.length > 0) return parsed;
    return [
      <script
        key={`head-snip-fallback-${s.id}`}
        id={`head-snip-${s.id}`}
        dangerouslySetInnerHTML={{ __html: s.code }}
      />,
    ];
  });

  if (gtmHeadNodes.length === 0 && customHeadNodes.length === 0 && dynamicHeadNodes.length === 0) {
    return null;
  }

  return (
    <>
      {gtmHeadNodes}
      {customHeadNodes}
      {dynamicHeadNodes}
    </>
  );
}

/**
 * CustomBodyEmbed:
 * Injects Google Tag Manager (GTM) Body (noscript iframe), legacy body scripts, and dynamic CustomCodeSnippets
 * for body_start or body_end during Server-Side Rendering (SSR).
 */
export function CustomBodyEmbed({
  settings,
  snippets = [],
  placement = "body_start",
}: {
  settings?: SiteSettingsRecord;
  snippets?: CustomCodeSnippet[];
  placement?: "body_start" | "body_end";
}) {
  // 1. If body_start: process legacy GTM Body Noscript and legacy customBodyScript
  let gtmBodyNode: React.ReactNode = null;
  let customBodyNode: React.ReactNode = null;

  if (placement === "body_start" && settings) {
    if (settings.gtmBodyScript && settings.gtmBodyScript.trim()) {
      const parsed = parseHeadSnippet(settings.gtmBodyScript, "gtm-body-custom");
      if (parsed.length > 0) {
        gtmBodyNode = <>{parsed}</>;
      } else {
        gtmBodyNode = (
          <noscript
            dangerouslySetInnerHTML={{
              __html: settings.gtmBodyScript.replace(/<\/?noscript>/gi, ""),
            }}
          />
        );
      }
    } else if (settings.gtmId && settings.gtmId.trim()) {
      const cleanId = settings.gtmId.trim().toUpperCase();
      gtmBodyNode = (
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(cleanId)}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
      );
    }

    if (settings.customBodyScript && settings.customBodyScript.trim()) {
      customBodyNode = (
        <div
          id="cms-custom-body-embed"
          style={{ display: "contents" }}
          dangerouslySetInnerHTML={{ __html: settings.customBodyScript }}
        />
      );
    }
  }

  // 2. Dynamic Custom Code Snippets matching the target placement
  const activeSnippets = Array.isArray(snippets)
    ? snippets.filter((s) => s.isActive && s.placement === placement)
    : [];

  const dynamicBodyNodes = activeSnippets.map((s) => {
    if (!s.code || !s.code.trim()) return null;
    return (
      <div
        key={`cms-snippet-${s.id}`}
        id={`cms-snippet-${s.id}`}
        style={{ display: "contents" }}
        dangerouslySetInnerHTML={{ __html: s.code }}
      />
    );
  }).filter(Boolean);

  if (!gtmBodyNode && !customBodyNode && dynamicBodyNodes.length === 0) {
    return null;
  }

  return (
    <>
      {gtmBodyNode}
      {customBodyNode}
      {dynamicBodyNodes}
    </>
  );
}
