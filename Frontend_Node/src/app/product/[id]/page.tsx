'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { productService, recommendationService } from '@/services';
import { useApiResource } from '@/hooks/useApiResource';
import { useCartStore } from '@/store/useCartStore';
import { useWishlistStore } from '@/store/useWishlistStore';
import { useToast } from '@/context/ToastContext';
import { getImageUrl, formatCurrency, effectivePrice, stockLabel } from '@/lib/format';
import { cn } from '@/lib/utils';
import { AccordionItem } from '@/components/ui/Accordion';
import { Badge, Button, Price, StarRating } from '@/components/ui/Primitives';
import { ErrorState, Skeleton } from '@/components/ui/Feedback';
import { ProductSection } from '@/components/product/ProductSection';
import { ProductReviews } from '@/components/product/ProductReviews';

const STOCK_TONE = {
  in: 'text-secondary',
  low: 'text-amber-600',
  out: 'text-error',
} as const;

const ProductSkeleton: React.FC = () => (
  <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-12 px-4 py-12 sm:px-8 lg:grid-cols-2">
    <Skeleton className="aspect-[4/5] w-full rounded-2xl" />
    <div className="space-y-4 py-6">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-10 w-4/5" />
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-14 w-full rounded-md" />
    </div>
  </div>
);

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();

  const productId = Number(params.id);
  const isValidId = Number.isFinite(productId) && productId > 0;

  const addItem = useCartStore((s) => s.addItem);
  const toggleWishlist = useWishlistStore((s) => s.toggle);
  const isWishlisted = useWishlistStore(
    (s) => s.hydrated && s.getLines().some((line) => line.productId === productId)
  );

  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [adding, setAdding] = useState(false);

  const product = useApiResource(
    (signal) => productService.detail(productId, signal),
    [productId],
    { enabled: isValidId }
  );

  const related = useApiResource(
    (signal) => productService.related(productId, signal),
    [productId],
    { enabled: isValidId }
  );

  const alsoBought = useApiResource(
    (signal) => recommendationService.frequentlyBoughtTogether(productId, signal),
    [productId],
    { enabled: isValidId }
  );

  if (!isValidId) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24">
        <ErrorState
          title="Product not found"
          message="That product link looks malformed."
          onRetry={() => router.push('/products')}
        />
      </div>
    );
  }

  if (product.loading) return <ProductSkeleton />;

  if (product.error || !product.data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24">
        <ErrorState
          title="Product unavailable"
          message={product.error ?? 'This product could not be found or is no longer for sale.'}
          onRetry={product.reload}
        />
        <div className="mt-6 text-center">
          <Link
            href="/products"
            className="text-xs font-bold uppercase tracking-widest text-primary underline"
          >
            Back to all products
          </Link>
        </div>
      </div>
    );
  }

  const item = product.data;
  const gallery = item.images?.length
    ? item.images.map((image) => image.image_url)
    : [item.primary_image ?? null];

  const stock = stockLabel(item.stock_quantity);
  const outOfStock = stock.tone === 'out';
  const maxQuantity = Math.max(1, Math.min(item.stock_quantity ?? 1, 10));
  const unitPrice = effectivePrice(item.price, item.sale_price);

  const cartPayload = {
    product_id: item.product_id,
    name: item.name,
    slug: item.slug,
    price: item.price,
    sale_price: item.sale_price,
    primary_image: gallery[0] ?? null,
    brand_name: item.brand_name,
    stock_quantity: item.stock_quantity,
  };

  const handleAddToCart = async (): Promise<boolean> => {
    if (outOfStock) return false;
    setAdding(true);
    try {
      await addItem(cartPayload, quantity);
      toast.success(`${item.name} added to your bag.`);
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not add to bag.');
      return false;
    } finally {
      setAdding(false);
    }
  };

  const handleWishlist = async () => {
    try {
      const saved = await toggleWishlist(cartPayload);
      toast.success(saved ? 'Saved to your wishlist.' : 'Removed from your wishlist.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update your wishlist.');
    }
  };

  // Only advance to checkout if the item actually made it into the bag.
  const buyNow = async () => {
    if (await handleAddToCart()) router.push('/checkout');
  };

  return (
    <div className="pb-20">
      <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-8">
        <nav aria-label="Breadcrumb" className="text-xs text-outline">
          <Link href="/" className="hover:text-primary">
            Home
          </Link>
          <span className="mx-2">/</span>
          <Link href="/products" className="hover:text-primary">
            Shop
          </Link>
          {item.category_name && (
            <>
              <span className="mx-2">/</span>
              <span className="text-on-surface-variant">{item.category_name}</span>
            </>
          )}
        </nav>
      </div>

      <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-10 px-4 sm:px-8 lg:grid-cols-2 lg:gap-16">
        {/* Gallery */}
        <div className="space-y-4">
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-surface-container">
            <Image
              src={getImageUrl(gallery[activeImage])}
              alt={`${item.name} — view ${activeImage + 1}`}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
            {(item.discount_percent ?? 0) > 0 && (
              <span className="absolute left-4 top-4 rounded-md bg-secondary-container px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-widest text-on-secondary-container">
                {item.discount_percent}% Off
              </span>
            )}
          </div>

          {gallery.length > 1 && (
            <div className="grid grid-cols-4 gap-3">
              {gallery.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  onClick={() => setActiveImage(index)}
                  aria-label={`View image ${index + 1}`}
                  aria-current={index === activeImage}
                  className={cn(
                    'relative aspect-square overflow-hidden rounded-lg border-2 bg-surface-container transition-colors',
                    index === activeImage
                      ? 'border-primary'
                      : 'border-transparent hover:border-outline-variant'
                  )}
                >
                  <Image src={getImageUrl(image)} alt="" fill sizes="120px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Purchase panel */}
        <div className="space-y-6 lg:py-4">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {item.brand_name && (
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-outline">
                  {item.brand_name}
                </span>
              )}
              {item.is_featured && <Badge tone="accent">Featured</Badge>}
            </div>

            <h1 className="font-headline text-4xl font-extrabold leading-tight tracking-tight text-primary sm:text-5xl">
              {item.name}
            </h1>

            {item.short_description && (
              <p className="text-base leading-relaxed text-on-surface-variant">
                {item.short_description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-4">
              {(item.review_count ?? 0) > 0 ? (
                <a href="#reviews" className="transition-opacity hover:opacity-75">
                  <StarRating rating={item.avg_rating ?? 0} count={item.review_count} />
                </a>
              ) : (
                <span className="text-xs uppercase tracking-wider text-outline">No reviews yet</span>
              )}
              <span className="text-xs text-outline">SKU: {item.sku}</span>
            </div>
          </div>

          <div className="space-y-2 border-y border-outline-variant/30 py-5">
            <Price price={item.price} salePrice={item.sale_price} size="lg" />
            <p className="text-xs text-outline">Inclusive of all taxes</p>
            <p className={cn('flex items-center gap-1.5 text-sm font-semibold', STOCK_TONE[stock.tone])}>
              <span className="material-symbols-outlined text-base">
                {stock.tone === 'out' ? 'cancel' : 'check_circle'}
              </span>
              {stock.label}
            </p>
          </div>

          {/* Quantity */}
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
              Quantity
            </span>
            <div className="flex items-center overflow-hidden rounded-md border border-outline-variant">
              <button
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                disabled={quantity <= 1 || outOfStock}
                aria-label="Decrease quantity"
                className="px-4 py-2.5 text-on-surface transition-colors hover:bg-surface-container disabled:opacity-40"
              >
                −
              </button>
              <span className="min-w-12 px-4 py-2.5 text-center text-sm font-bold text-primary">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity((value) => Math.min(maxQuantity, value + 1))}
                disabled={quantity >= maxQuantity || outOfStock}
                aria-label="Increase quantity"
                className="px-4 py-2.5 text-on-surface transition-colors hover:bg-surface-container disabled:opacity-40"
              >
                +
              </button>
            </div>
            {!outOfStock && (
              <span className="text-sm text-on-surface-variant">
                Subtotal{' '}
                <strong className="text-primary">{formatCurrency(unitPrice * quantity)}</strong>
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <div className="flex gap-3">
              <Button
                onClick={handleAddToCart}
                loading={adding}
                disabled={outOfStock}
                fullWidth
                icon="shopping_bag"
                className="py-4"
              >
                {outOfStock ? 'Out of Stock' : 'Add to Bag'}
              </Button>
              <button
                onClick={handleWishlist}
                aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                aria-pressed={isWishlisted}
                className="flex w-14 shrink-0 items-center justify-center rounded-md border border-outline-variant text-on-surface transition-colors hover:border-error hover:text-error"
              >
                <span
                  className={cn('material-symbols-outlined text-2xl', isWishlisted && 'fill text-error')}
                >
                  favorite
                </span>
              </button>
            </div>

            <Button
              variant="outline"
              onClick={buyNow}
              disabled={outOfStock || adding}
              fullWidth
              className="py-4"
            >
              Buy It Now
            </Button>
          </div>

          {/* Details */}
          <div className="pt-2">
            {item.description && (
              <AccordionItem title="Description" defaultOpen>
                <p className="whitespace-pre-line">{item.description}</p>
              </AccordionItem>
            )}
            <AccordionItem title="Product Details">
              <dl className="space-y-1.5">
                <div className="flex justify-between">
                  <dt className="text-outline">SKU</dt>
                  <dd className="font-medium text-on-surface">{item.sku}</dd>
                </div>
                {item.brand_name && (
                  <div className="flex justify-between">
                    <dt className="text-outline">Brand</dt>
                    <dd className="font-medium text-on-surface">{item.brand_name}</dd>
                  </div>
                )}
                {item.category_name && (
                  <div className="flex justify-between">
                    <dt className="text-outline">Category</dt>
                    <dd className="font-medium text-on-surface">{item.category_name}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-outline">Availability</dt>
                  <dd className="font-medium text-on-surface">{stock.label}</dd>
                </div>
              </dl>
            </AccordionItem>
            <AccordionItem title="Shipping & Returns">
              <p>
                Complimentary express shipping on orders over ₹500; a flat ₹49 applies below that.
                Delivered orders can be returned within 7 days from your account.
              </p>
            </AccordionItem>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1440px] px-4 pt-20 sm:px-8">
        <ProductReviews
          productId={productId}
          averageRating={item.avg_rating ?? 0}
          reviewCount={item.review_count ?? 0}
          onReviewSubmitted={product.reload}
        />
      </div>

      <div className="space-y-20 pt-20">
        <ProductSection
          eyebrow="Complete the look"
          title="Frequently Bought Together"
          products={alsoBought.data}
          loading={alsoBought.loading}
          error={alsoBought.error}
          onRetry={alsoBought.reload}
          limit={4}
          hideWhenEmpty
        />

        <ProductSection
          eyebrow="You may also like"
          title="Related Products"
          products={related.data}
          loading={related.loading}
          error={related.error}
          onRetry={related.reload}
          limit={4}
          hideWhenEmpty
        />
      </div>
    </div>
  );
}
