import { prisma } from "@/lib/db";

type BestSellingProductRow = {
  id: string;
  name: string;
  nameAr: string | null;
  unitsSold: bigint;
};

export async function getBestSellingProducts(start: Date, end: Date, limit: number) {
  const products = await prisma.$queryRaw<BestSellingProductRow[]>`
    SELECT product.id, product.name, product.nameAr, SUM(orderitem.quantity) AS unitsSold
    FROM \`OrderItem\` AS orderitem
    INNER JOIN \`Order\` AS orders ON orders.id = orderitem.orderId
    INNER JOIN \`ProductVariant\` AS productvariant ON productvariant.id = orderitem.variantId
    INNER JOIN \`Product\` AS product ON product.id = productvariant.productId
    WHERE orders.status IN ('PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED')
      AND orders.createdAt >= ${start}
      AND orders.createdAt <= ${end}
    GROUP BY product.id, product.name, product.nameAr
    ORDER BY unitsSold DESC, product.id ASC
    LIMIT ${limit}
  `;

  return products.map((product) => ({
    id: product.id,
    name: product.name,
    nameAr: product.nameAr,
    unitsSold: Number(product.unitsSold),
  }));
}
