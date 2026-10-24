-- Add store-managed content, promotions, and reviews without rewriting existing records.
-- The default length keeps all existing product variants valid as "standard".
ALTER TABLE `productvariant` DROP FOREIGN KEY `ProductVariant_productId_fkey`;

DROP INDEX `ProductVariant_productId_sizeId_colorId_key` ON `productvariant`;

ALTER TABLE `productvariant`
    ADD COLUMN `length` VARCHAR(40) NOT NULL DEFAULT 'standard';

CREATE TABLE `Promotion` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `nameAr` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `type` ENUM('PERCENTAGE', 'FIXED_AMOUNT', 'BUY_X_GET_Y', 'FREE_SHIPPING') NOT NULL,
    `value` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `buyQuantity` INTEGER NULL,
    `getQuantity` INTEGER NULL,
    `startsAt` DATETIME(3) NULL,
    `endsAt` DATETIME(3) NULL,
    `maxRedemptions` INTEGER NULL,
    `redemptionCount` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `Promotion_isActive_startsAt_endsAt_idx`(`isActive`, `startsAt`, `endsAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Review` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `reviewerName` VARCHAR(191) NULL,
    `rating` INTEGER NOT NULL,
    `title` VARCHAR(191) NULL,
    `body` TEXT NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `verifiedPurchase` BOOLEAN NOT NULL DEFAULT false,
    `moderatedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `Review_productId_status_createdAt_idx`(`productId`, `status`, `createdAt`),
    INDEX `Review_userId_idx`(`userId`),
    UNIQUE INDEX `Review_productId_userId_key`(`productId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Banner` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `titleAr` VARCHAR(191) NULL,
    `subtitle` TEXT NULL,
    `subtitleAr` TEXT NULL,
    `imageUrl` VARCHAR(191) NOT NULL,
    `mobileImageUrl` VARCHAR(191) NULL,
    `altText` VARCHAR(191) NULL,
    `linkUrl` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `startsAt` DATETIME(3) NULL,
    `endsAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `Banner_isActive_sortOrder_idx`(`isActive`, `sortOrder`),
    INDEX `Banner_startsAt_endsAt_idx`(`startsAt`, `endsAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `HomeSection` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `type` ENUM('PRODUCTS', 'CATEGORIES', 'BANNER', 'PROMOTION') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `titleAr` VARCHAR(191) NULL,
    `subtitle` VARCHAR(191) NULL,
    `subtitleAr` VARCHAR(191) NULL,
    `linkUrl` VARCHAR(191) NULL,
    `categoryId` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `HomeSection_key_key`(`key`),
    INDEX `HomeSection_isActive_sortOrder_idx`(`isActive`, `sortOrder`),
    INDEX `HomeSection_categoryId_idx`(`categoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `HomeSectionProduct` (
    `id` VARCHAR(191) NOT NULL,
    `sectionId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    INDEX `HomeSectionProduct_productId_idx`(`productId`),
    UNIQUE INDEX `HomeSectionProduct_sectionId_productId_key`(`sectionId`, `productId`),
    UNIQUE INDEX `HomeSectionProduct_sectionId_sortOrder_key`(`sectionId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Page` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `titleAr` VARCHAR(191) NULL,
    `content` LONGTEXT NOT NULL,
    `contentAr` LONGTEXT NULL,
    `seoTitle` VARCHAR(191) NULL,
    `seoTitleAr` VARCHAR(191) NULL,
    `seoDescription` TEXT NULL,
    `seoDescriptionAr` TEXT NULL,
    `isPublished` BOOLEAN NOT NULL DEFAULT false,
    `publishedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `Page_slug_key`(`slug`),
    INDEX `Page_isPublished_publishedAt_idx`(`isPublished`, `publishedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE UNIQUE INDEX `ProductVariant_productId_sizeId_colorId_length_key`
    ON `productvariant`(`productId`, `sizeId`, `colorId`, `length`);

ALTER TABLE `productvariant`
    ADD CONSTRAINT `ProductVariant_productId_fkey`
    FOREIGN KEY (`productId`) REFERENCES `product`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Review`
    ADD CONSTRAINT `Review_productId_fkey`
    FOREIGN KEY (`productId`) REFERENCES `product`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Review`
    ADD CONSTRAINT `Review_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `user`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `HomeSection`
    ADD CONSTRAINT `HomeSection_categoryId_fkey`
    FOREIGN KEY (`categoryId`) REFERENCES `category`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `HomeSectionProduct`
    ADD CONSTRAINT `HomeSectionProduct_sectionId_fkey`
    FOREIGN KEY (`sectionId`) REFERENCES `HomeSection`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `HomeSectionProduct`
    ADD CONSTRAINT `HomeSectionProduct_productId_fkey`
    FOREIGN KEY (`productId`) REFERENCES `product`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;
