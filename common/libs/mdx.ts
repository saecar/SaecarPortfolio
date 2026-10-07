import fs from "fs";
import path from "path";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkMdx from "remark-mdx";
import remarkParse from "remark-parse";
import matter from "gray-matter";

import { MdxFileProps } from "../types/mdx";

export const loadMdxFiles = (): MdxFileProps[] => {
  const dirPath = path.join(process.cwd(), "contents", "projects");

  if (!fs.existsSync(dirPath)) {
    return [];
  }

  const files = fs.readdirSync(dirPath);

  const contents = files
    .map((file) => {
      try {
        const filePath = path.join(dirPath, file);
        const source = fs.readFileSync(filePath, "utf-8");
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
          slug: file.replace(".mdx", ""),
          frontMatter: data,
          content: mdxContent,
        };
      } catch (err: any) {
        console.warn(`[MDX] Failed reading ${file}:`, err.message);
        return null;
      }
    })
    .filter((item): item is MdxFileProps => Boolean(item));

  return contents;
};
