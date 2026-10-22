import type { MetadataRoute } from "next";
import { adminBasePath } from "@/lib/admin-path";

export default function robots(): MetadataRoute.Robots {
  const admin = adminBasePath();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [...new Set(["/admin", "/admin/", admin, `${admin}/`, "/api/admin"])],
    },
    sitemap: "https://toaletepublice.com/sitemap.xml",
  };
}
