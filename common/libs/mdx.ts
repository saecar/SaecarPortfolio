import fs from "fs";
import path from "path";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkMdx from "remark-mdx";
import remarkParse from "remark-parse";
import matter from "gray-matter";

import { MdxFileProps } from "../types/mdx";

const mdxCache = new Map<string, MdxFileProps>();

const compileMdxFile = (source: string, slug: string): MdxFileProps => {
  const { content, data } = matter(source);

  let mdxContent = content;
  try {
    const mdxCompiler = remark().use(remarkParse).use(remarkGfm).use(remarkMdx);
    mdxContent = mdxCompiler.processSync(content).toString();
  } catch {
    const safeCompiler = remark().use(remarkParse).use(remarkGfm);
    mdxContent = safeCompiler.processSync(content).toString();
  }

  return {
    slug,
    frontMatter: data,
    content: mdxContent,
  };
};

export const getMdxBySlug = (slug: string): MdxFileProps | null => {
  if (mdxCache.has(slug)) {
    return mdxCache.get(slug)!;
  }

  const dirPath = path.join(process.cwd(), "contents", "projects");
  const filePath = path.join(dirPath, `${slug}.mdx`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const source = fs.readFileSync(filePath, "utf-8");
    const compiled = compileMdxFile(source, slug);
    mdxCache.set(slug, compiled);
    return compiled;
  } catch (err: any) {
    console.warn(`[MDX] Failed reading ${slug}.mdx:`, err.message);
    return null;
  }
};

export const loadMdxFiles = (): MdxFileProps[] => {
  const dirPath = path.join(process.cwd(), "contents", "projects");

  if (!fs.existsSync(dirPath)) {
    return [];
  }

  const files = fs.readdirSync(dirPath);

  const contents = files
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => {
      const slug = file.replace(".mdx", "");
      if (mdxCache.has(slug)) {
        return mdxCache.get(slug)!;
      }

      try {
        const filePath = path.join(dirPath, file);
        const source = fs.readFileSync(filePath, "utf-8");
        const compiled = compileMdxFile(source, slug);
        mdxCache.set(slug, compiled);
        return compiled;
      } catch (err: any) {
        console.warn(`[MDX] Failed reading ${file}:`, err.message);
        return null;
      }
    })
    .filter((item): item is MdxFileProps => Boolean(item));

  return contents;
};
