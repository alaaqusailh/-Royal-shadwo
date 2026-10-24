-- AlterTable
ALTER TABLE `category` ADD COLUMN `descriptionAr` TEXT NULL,
    ADD COLUMN `nameAr` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `color` ADD COLUMN `nameAr` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `inventorymovement` MODIFY `type` ENUM('RESERVATION', 'SALE', 'RESTOCK', 'ADJUSTMENT', 'RETURN', 'RESERVATION_RELEASE') NOT NULL;

-- AlterTable
ALTER TABLE `order` ADD COLUMN `shippingAddress` JSON NULL;

-- AlterTable
ALTER TABLE `product` ADD COLUMN `descriptionAr` TEXT NULL,
    ADD COLUMN `fabric` VARCHAR(191) NULL,
    ADD COLUMN `nameAr` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `CartItem_productId_idx` ON `CartItem`(`productId`);

-- CreateIndex
CREATE INDEX `CartItem_variantId_idx` ON `CartItem`(`variantId`);

-- AddForeignKey
ALTER TABLE `CartItem` ADD CONSTRAINT `CartItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CartItem` ADD CONSTRAINT `CartItem_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `ProductVariant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
