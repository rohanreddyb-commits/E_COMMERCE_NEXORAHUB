import { Router } from 'express';
import { customerApiRateLimiter } from '../../common/middleware/rateLimiter.middleware';

import authRoutes from '../../modules/authentication/customer.auth.routes';
import profileRoutes from '../../modules/profile/profile.routes';
import addressRoutes from '../../modules/address/customer.address.routes';
import wishlistRoutes from '../../modules/wishlist/wishlist.routes';
import cartRoutes from '../../modules/cart/customer.cart.routes';
import checkoutRoutes from '../../modules/checkout/checkout.routes';
import orderRoutes from '../../modules/orders/customer.order.routes';
import paymentRoutes from '../../modules/payments/payment.routes';
import productRoutes from '../../modules/products/customer.product.routes';
import searchRoutes from '../../modules/search/search.routes';
import recommendationRoutes from '../../modules/recommendations/recommendation.routes';
import couponRoutes from '../../modules/coupons/customer.coupon.routes';
import reviewRoutes from '../../modules/reviews/customer.review.routes';
import notificationRoutes from '../../modules/notifications/notification.routes';
import returnRoutes from '../../modules/returns/customer.return.routes';
import supportRoutes from '../../modules/support/customer.support.routes';
import loyaltyRoutes from '../../modules/loyalty/loyalty.routes';
import referralRoutes from '../../modules/referrals/customer.referral.routes';

const v1CustomerRouter = Router();

// requestIdMiddleware is applied globally in app.ts; the customer tree adds
// its own tighter rate limit on top of the global one.
v1CustomerRouter.use(customerApiRateLimiter);

// Module Router Mounts — strictly namespaced under /api/v1/customer/*
v1CustomerRouter.use('/auth', authRoutes);
v1CustomerRouter.use('/profile', profileRoutes);
v1CustomerRouter.use('/addresses', addressRoutes);
v1CustomerRouter.use('/wishlist', wishlistRoutes);
v1CustomerRouter.use('/cart', cartRoutes);
v1CustomerRouter.use('/checkout', checkoutRoutes);
v1CustomerRouter.use('/orders', orderRoutes);
v1CustomerRouter.use('/payments', paymentRoutes);
v1CustomerRouter.use('/products', productRoutes);
v1CustomerRouter.use('/search', searchRoutes);
v1CustomerRouter.use('/recommendations', recommendationRoutes);
v1CustomerRouter.use('/coupons', couponRoutes);
v1CustomerRouter.use('/reviews', reviewRoutes);
v1CustomerRouter.use('/notifications', notificationRoutes);
v1CustomerRouter.use('/returns', returnRoutes);
v1CustomerRouter.use('/support', supportRoutes);
v1CustomerRouter.use('/loyalty', loyaltyRoutes);
v1CustomerRouter.use('/referrals', referralRoutes);

export default v1CustomerRouter;
