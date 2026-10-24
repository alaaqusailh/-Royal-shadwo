import { BRAND } from "@/lib/brand";

const document = {
  openapi: "3.1.0",
  info: {
    title: `${BRAND.name.en} Store API`,
    version: "1.0.0",
    description: "Versioned storefront and admin API served by the existing Next.js application.",
  },
  servers: [{ url: "/" }],
  paths: {
    "/api/v1/cart": {
      get: {
        summary: "Get the current guest cart",
        responses: { "200": { description: "Cart contents and availability; a secure session cookie is issued when needed." } },
      },
      delete: {
        summary: "Clear the current guest cart",
        responses: { "200": { description: "The guest cart has been cleared." } },
      },
    },
    "/api/v1/cart/items": {
      post: {
        summary: "Add an explicitly selected product variant to the guest cart",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["variantId"],
                properties: {
                  variantId: { type: "string", minLength: 1, maxLength: 191 },
                  quantity: { type: "integer", minimum: 1, maximum: 10, default: 1 },
                },
              },
            },
          },
        },
        responses: { "201": { description: "Updated cart.", headers: { "Set-Cookie": { description: "HttpOnly guest cart session cookie." } } }, "409": { description: "The selected quantity is unavailable." } },
      },
    },
    "/api/v1/cart/items/{id}": {
      patch: {
        summary: "Update a guest cart item's quantity",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["quantity"], additionalProperties: false, properties: { quantity: { type: "integer", minimum: 1, maximum: 10 } } } } } },
        responses: { "200": { description: "Updated cart." }, "409": { description: "The selected quantity is unavailable." } },
      },
      delete: {
        summary: "Remove a guest cart item, including an unavailable legacy item",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Updated cart." }, "404": { description: "Cart item not found." } },
      },
    },
    "/api/v1/products": {
      get: {
        summary: "List published products",
        parameters: [
          { name: "q", in: "query", schema: { type: "string", maxLength: 100 } },
          { name: "category", in: "query", schema: { type: "string" } },
          { name: "size", in: "query", schema: { type: "string" } },
          { name: "color", in: "query", schema: { type: "string" } },
          { name: "fabric", in: "query", schema: { type: "string" } },
          { name: "minPrice", in: "query", schema: { type: "number", minimum: 0 } },
          { name: "maxPrice", in: "query", schema: { type: "number", minimum: 0 } },
          { name: "sort", in: "query", schema: { type: "string", enum: ["newest", "price-asc", "price-desc", "best-selling"] } },
          { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 24 } },
        ],
        responses: {
          "200": { description: "Published products and pagination metadata." },
          "400": { description: "Invalid query parameters." },
        },
      },
    },
    "/api/v1/products/{slug}": {
      get: {
        summary: "Get a published product",
        parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Product details and approved review summary." },
          "404": { description: "Product not found." },
        },
      },
    },
    "/api/v1/products/{slug}/reviews": {
      get: {
        summary: "List approved reviews for a published product",
        parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Approved reviews and pagination metadata." } },
      },
      post: {
        summary: "Submit a product review for moderation",
        security: [{ sessionCookie: [] }],
        parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["rating", "body"],
                properties: {
                  rating: { type: "integer", minimum: 1, maximum: 5 },
                  title: { type: "string", maxLength: 191 },
                  body: { type: "string", minLength: 10, maxLength: 4000 },
                },
              },
            },
          },
        },
        responses: { "201": { description: "Review submitted for moderation." }, "409": { description: "A review already exists for this product." } },
      },
    },
    "/api/v1/categories": {
      get: {
        summary: "List categories containing published products",
        responses: { "200": { description: "Public categories." } },
      },
    },
    "/api/v1/search": {
      get: {
        summary: "Search published products",
        parameters: [{ name: "q", in: "query", required: true, schema: { type: "string", minLength: 1, maxLength: 100 } }],
        responses: {
          "200": { description: "Matching products and pagination metadata." },
          "400": { description: "A search query is required or invalid." },
        },
      },
    },
    "/api/v1/home": {
      get: {
        summary: "Get active banners, homepage sections, and promotions",
        responses: { "200": { description: "Published homepage content from the database." } },
      },
    },
    "/api/v1/pages/{slug}": {
      get: {
        summary: "Get a published content page",
        parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Page content with Arabic and English SEO fields." },
          "404": { description: "Page not found." },
        },
      },
    },
    "/api/v1/settings/public": {
      get: {
        summary: "Get explicitly public store settings",
        responses: { "200": { description: "Allow-listed public settings; private payment credentials are excluded." } },
      },
    },
    "/api/admin/v1/dashboard": {
      get: {
        summary: "Get database-backed admin metrics",
        security: [{ sessionCookie: [] }],
        parameters: [{ name: "range", in: "query", schema: { type: "string", enum: ["7d", "30d", "90d"], default: "7d" } }],
        responses: {
          "200": { description: "Sales, order, inventory, and best-seller metrics." },
          "401": { description: "Admin authentication is required." },
          "403": { description: "The account does not have an admin role." },
        },
      },
    },
    "/api/admin/v1/products": {
      get: {
        summary: "List admin products",
        security: [{ sessionCookie: [] }],
        responses: { "200": { description: "Paginated products, including unpublished products." } },
      },
      post: {
        summary: "Create a product with images, variants, and initial inventory",
        security: [{ sessionCookie: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
        responses: {
          "201": { description: "Product created and audited." },
          "409": { description: "Product slug or variant SKU conflicts with an existing record." },
        },
      },
    },
    "/api/admin/v1/products/{id}": {
      get: {
        summary: "Get an admin product with variants and inventory",
        security: [{ sessionCookie: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Admin product details." }, "404": { description: "Product not found." } },
      },
      patch: {
        summary: "Update product fields",
        security: [{ sessionCookie: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
        responses: { "200": { description: "Product updated and audited." }, "409": { description: "Product slug conflict." } },
      },
      delete: {
        summary: "Archive a product without deleting historical data",
        security: [{ sessionCookie: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Product unpublished and variants deactivated." } },
      },
    },
    "/api/admin/v1/categories": {
      get: {
        summary: "List admin categories",
        security: [{ sessionCookie: [] }],
        responses: { "200": { description: "Categories and related product counts." } },
      },
      post: {
        summary: "Create a category",
        security: [{ sessionCookie: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object" } } },
        },
        responses: { "201": { description: "Category created and audited." } },
      },
    },
    "/api/admin/v1/orders": {
      get: {
        summary: "List and filter orders",
        security: [{ sessionCookie: [] }],
        responses: { "200": { description: "Paginated orders." } },
      },
    },
    "/api/admin/v1/orders/{id}/status": {
      patch: {
        summary: "Advance an order through a verified status transition",
        security: [{ sessionCookie: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["status"],
                properties: { status: { type: "string", enum: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"] } },
              },
            },
          },
        },
        responses: {
          "200": { description: "Status updated and audited." },
          "409": { description: "Invalid transition, unverified payment, or stock reservation mismatch." },
        },
      },
    },
    "/api/admin/v1/inventory": {
      get: {
        summary: "List inventory and low-stock records",
        security: [{ sessionCookie: [] }],
        responses: { "200": { description: "Paginated inventory." } },
      },
      patch: {
        summary: "Adjust available stock",
        security: [{ sessionCookie: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", required: ["inventoryId", "delta", "reason"] },
            },
          },
        },
        responses: { "200": { description: "Inventory adjusted with movement and audit records." } },
      },
    },
    "/api/admin/v1/customers": {
      get: {
        summary: "Search and list customer accounts",
        security: [{ sessionCookie: [] }],
        responses: { "200": { description: "Paginated customer records." } },
      },
    },
    "/api/admin/v1/promotions": {
      get: {
        summary: "List promotions",
        security: [{ sessionCookie: [] }],
        responses: { "200": { description: "Database-backed promotions." } },
      },
      post: {
        summary: "Create a promotion",
        security: [{ sessionCookie: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
        responses: { "201": { description: "Promotion created and audited." } },
      },
    },
    "/api/admin/v1/banners": {
      get: {
        summary: "List banners",
        security: [{ sessionCookie: [] }],
        responses: { "200": { description: "Banners ordered for administration." } },
      },
      post: {
        summary: "Create a banner",
        security: [{ sessionCookie: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
        responses: { "201": { description: "Banner created and audited." } },
      },
    },
    "/api/admin/v1/banners/{id}": {
      patch: {
        summary: "Update a banner link or publication status",
        security: [{ sessionCookie: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  isActive: { type: "boolean" },
                  linkUrl: { type: ["string", "null"], maxLength: 500, description: "An HTTPS URL or same-site path; null removes the link." },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Banner updated and audited." },
          "401": { description: "Administrator authentication is required." },
          "403": { description: "The account lacks permission to manage banners." },
          "404": { description: "Banner not found." },
          "422": { description: "The link is invalid." },
        },
      },
    },
    "/api/admin/v1/uploads": {
      post: {
        summary: "Upload a JPEG, PNG, or WebP image from an administrator device",
        security: [{ sessionCookie: [] }],
        requestBody: {
          required: true,
          content: { "multipart/form-data": { schema: { type: "object", required: ["file"], properties: { file: { type: "string", format: "binary" } } } } },
        },
        responses: {
          "201": { description: "Image saved to the configured local image storage." },
          "401": { description: "Administrator authentication is required." },
          "413": { description: "Image exceeds the configured upload size." },
          "415": { description: "The file format is not supported." },
        },
      },
      delete: {
        summary: "Delete an unused uploaded image; shared images are retained",
        security: [{ sessionCookie: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", required: ["path"], properties: { path: { type: "string" } } },
            },
          },
        },
        responses: { "200": { description: "Image removed or retained because saved content still references it." } },
      },
    },
    "/uploads/{filename}": {
      get: {
        summary: "Serve a persisted uploaded image",
        parameters: [{ name: "filename", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Uploaded image bytes." }, "404": { description: "Image is missing or invalid." } },
      },
    },
    "/api/admin/v1/home-sections": {
      get: {
        summary: "List homepage sections and placements",
        security: [{ sessionCookie: [] }],
        responses: { "200": { description: "Homepage sections and linked products." } },
      },
      post: {
        summary: "Create a homepage section and ordered product placements",
        security: [{ sessionCookie: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
        responses: { "201": { description: "Homepage section created and audited." } },
      },
    },
    "/api/admin/v1/home-sections/{id}": {
      patch: {
        summary: "Update homepage section visibility or its optional destination link",
        security: [{ sessionCookie: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                minProperties: 1,
                properties: {
                  isActive: { type: "boolean" },
                  linkUrl: { type: ["string", "null"], maxLength: 500, description: "Same-site path or HTTPS URL; null clears the link." },
                },
                additionalProperties: false,
              },
            },
          },
        },
        responses: {
          "200": { description: "Homepage section updated and audited." },
          "401": { description: "Administrator authentication is required." },
          "403": { description: "The account cannot manage homepage content." },
          "404": { description: "Homepage section not found." },
        },
      },
    },
    "/api/admin/v1/pages": {
      get: {
        summary: "List content pages",
        security: [{ sessionCookie: [] }],
        responses: { "200": { description: "Page metadata." } },
      },
      post: {
        summary: "Create an Arabic and English content page",
        security: [{ sessionCookie: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
        responses: { "201": { description: "Page created and audited." } },
      },
    },
    "/api/admin/v1/reviews": {
      get: {
        summary: "List and filter reviews for moderation",
        security: [{ sessionCookie: [] }],
        responses: { "200": { description: "Paginated reviews." } },
      },
    },
    "/api/admin/v1/reviews/{id}": {
      patch: {
        summary: "Approve or reject a review",
        security: [{ sessionCookie: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["status"],
                properties: { status: { type: "string", enum: ["APPROVED", "REJECTED"] } },
              },
            },
          },
        },
        responses: { "200": { description: "Review moderated and audited." } },
      },
    },
  },
  components: {
    securitySchemes: {
      sessionCookie: {
        type: "apiKey",
        in: "cookie",
        name: "next-auth.session-token",
        description: "NextAuth session cookie; production deployments may use the __Secure- prefix.",
      },
    },
  },
} as const;

export async function GET() {
  return Response.json(document);
}
