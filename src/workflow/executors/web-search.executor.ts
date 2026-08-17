import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";

interface SearchResult {
  title: string;
  snippet: string;
  url: string;
}

export class WebSearchExecutor implements INodeExecutor {
  async execute(_node: IWorkflowNode, inputs: Record<string, unknown>): Promise<ExecutorResult> {
    const query = String(inputs.query ?? "").trim();
    if (!query) {
      throw new Error("query es requerido");
    }

    const maxResults = Number(inputs.maxResults ?? 5);
    const results = await this.searchDuckDuckGo(query, maxResults);

    const summary = results.length
      ? results.map((r, i) => `${i + 1}. **${r.title}**\n${r.snippet}\n${r.url}`).join("\n\n")
      : `No se encontraron resultados para "${query}".`;

    return {
      outputs: {
        summary,
        results,
        count: results.length,
      },
    };
  }

  private async searchDuckDuckGo(query: string, maxResults: number): Promise<SearchResult[]> {
    const params = new URLSearchParams({ q: query, kl: "wt-wt" });
    const response = await fetch(`https://html.duckduckgo.com/html/?${params.toString()}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(`Search failed: ${response.status}`);
    }

    const html = await response.text();
    return this.parseResults(html, maxResults);
  }

  private parseResults(html: string, maxResults: number): SearchResult[] {
    const results: SearchResult[] = [];

    const resultPattern = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    const snippetPattern = /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;

    const links: string[] = [];
    const titles: string[] = [];

    let match: RegExpExecArray | null;
    while ((match = resultPattern.exec(html)) !== null) {
      let url = match[1];
      const encodedUrl = new URLSearchParams(url.split("?")[1]).get("uddg");
      if (encodedUrl) {
        url = decodeURIComponent(encodedUrl);
      }
      const title = this.stripHtml(match[2]);
      links.push(url);
      titles.push(title);
    }

    const snippets: string[] = [];
    while ((match = snippetPattern.exec(html)) !== null) {
      snippets.push(this.stripHtml(match[1]));
    }

    const count = Math.min(maxResults, links.length);
    for (let i = 0; i < count; i++) {
      results.push({
        title: titles[i] ?? "",
        snippet: snippets[i] ?? "",
        url: links[i] ?? "",
      });
    }

    return results;
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, " ")
      .trim();
  }
}
