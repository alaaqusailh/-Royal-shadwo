-- Align the original baseline with the database constraints and indexes that predate this migration.
ALTER TABLE `cart` MODIFY `currency` enum('SAR') NOT NULL DEFAULT 'SAR';

ALTER TABLE `inventorymovement` MODIFY `type` enum('SALE','RESTOCK','ADJUSTMENT','RETURN','RESERVATION_RELEASE') NOT NULL;

ALTER TABLE `order` MODIFY `status` enum('PENDING','PAID','PROCESSING','SHIPPED','DELIVERED','CANCELLED','REFUNDED') NOT NULL DEFAULT 'PENDING',
    MODIFY `currency` enum('SAR') NOT NULL DEFAULT 'SAR';

ALTER TABLE `payment` MODIFY `status` enum('PENDING','AUTHORIZED','CAPTURED','FAILED','CANCELLED','REFUNDED') NOT NULL DEFAULT 'PENDING',
    MODIFY `currency` enum('SAR') NOT NULL DEFAULT 'SAR';

ALTER TABLE `role` MODIFY `name` enum('SUPER_ADMIN','PRODUCT_MANAGER','ORDER_MANAGER','SUPPORT_AGENT','CUSTOMER') NOT NULL;

ALTER TABLE `shipment` MODIFY `status` enum('PENDING','PACKING','SHIPPED','OUT_FOR_DELIVERY','DELIVERED','FAILED') NOT NULL DEFAULT 'PENDING';

ALTER TABLE `user` MODIFY `locale` enum('en','ar') NOT NULL DEFAULT 'en';

CREATE INDEX `Permission_name_idx` ON `permission`(`name` ASC);

CREATE INDEX `Role_name_idx` ON `role`(`name` ASC);
