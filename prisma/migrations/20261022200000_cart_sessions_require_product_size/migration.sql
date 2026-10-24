ALTER TABLE `product`
    ADD COLUMN `requiresSize` BOOLEAN NOT NULL DEFAULT true;

DROP INDEX `Cart_sessionId_idx` ON `cart`;

CREATE UNIQUE INDEX `Cart_sessionId_key` ON `cart`(`sessionId`);

CREATE UNIQUE INDEX `CartItem_cartId_variantId_key` ON `cartitem`(`cartId`, `variantId`);
