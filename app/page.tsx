"use client";

import { useEffect, useRef, useState } from "react";

type Meal = {
  name: string;
  image: string;
  eyebrow: string;
  description: string;
  minutes: number;
  calories: number;
  price: number;
};

type Flight = {
  image: string;
  left: number;
  top: number;
  width: number;
  height: number;
  x: number;
  y: number;
  midX: number;
  midY: number;
};

type CartItem = {
  id: string;
  mealIndex: number;
  quantity: number;
  spiceIndex: number;
};

type ActiveOrder = {
  id: string;
  mealIndex: number;
  items: CartItem[];
  total: number;
  startedAt: number;
  durationSeconds: number;
  displayStartSeconds: number;
};

type CompletedOrder = ActiveOrder & {
  completedAt: number;
};

const PROMO_CODE = "INDOMIECAFE";
const PROMO_DISCOUNT_PERCENT = 20;

const meals: Meal[] = [
  {
    name: "Prawn Mie",
    image: "/prawn-mie.png",
    eyebrow: "Ocean favourite",
    description:
      "Stir-fried noodles with juicy tiger prawns, wok-tossed greens, and bold Indomie seasoning.",
    minutes: 12,
    calories: 540,
    price: 4500,
  },
  {
    name: "Spicy Native",
    image: "/spicy-native.png",
    eyebrow: "Local heat",
    description:
      "Fiery native-style noodles with smoky peppers, tender meat, and deep local spices.",
    minutes: 14,
    calories: 575,
    price: 4200,
  },
  {
    name: "Tropicana",
    image: "/tropicana.png",
    eyebrow: "Bright and fresh",
    description:
      "Colourful noodles tossed with crisp vegetables, sweet peppers, and a light tropical finish.",
    minutes: 10,
    calories: 490,
    price: 3800,
  },
  {
    name: "Indogizdo",
    image: "/indogizdo.png",
    eyebrow: "CafÃ© signature",
    description:
      "A rich, savoury mix of Indomie, gizzard, plantain, peppers, and signature cafÃ© seasoning.",
    minutes: 15,
    calories: 610,
    price: 4600,
  },
  {
    name: "Sausage Indomie",
    image: "/sausage-indomie.png",
    eyebrow: "Classic comfort",
    description:
      "The cafÃ© classic loaded with savoury sausage bites, vegetables, and aromatic spices.",
    minutes: 11,
    calories: 560,
    price: 3900,
  },
];

const spiceLevels = [
  { name: "Mild", note: "Gentle", color: "#5dbf74" },
  { name: "Medium", note: "Noticeable", color: "#d4b824" },
  { name: "Hot", note: "Fiery & bold", color: "#e85f20" },
  { name: "Inferno", note: "Full heat", color: "#be1a14" },
];

type WheelReward = {
  id: "ten" | "twenty-five" | "forty" | "delivery" | "nothing" | "extra";
  label: string;
  shortLabel: string;
  weight: number;
  discount?: number;
  freeDelivery?: boolean;
  extraSpin?: boolean;
};

const wheelRewards: WheelReward[] = [
  { id: "ten", label: "10% discount", shortLabel: "10% OFF", weight: 36, discount: 10 },
  {
    id: "twenty-five",
    label: "25% discount",
    shortLabel: "25% OFF",
    weight: 8,
    discount: 25,
  },
  { id: "forty", label: "40% discount", shortLabel: "40% OFF", weight: 2, discount: 40 },
  {
    id: "delivery",
    label: "Free delivery",
    shortLabel: "FREE DELIVERY",
    weight: 28,
    freeDelivery: true,
  },
  { id: "nothing", label: "No prize this time", shortLabel: "SO CLOSE", weight: 19 },
  {
    id: "extra",
    label: "One extra spin",
    shortLabel: "SPIN AGAIN",
    weight: 7,
    extraSpin: true,
  },
];

const orderStages = [
  { name: "Preparing", note: "Your noodles are being tossed fresh" },
  { name: "Dispatched", note: "Your order has left the cafÃ©" },
  { name: "On the way", note: "Your rider is heading to you" },
  { name: "Delivered", note: "Your Indomie CafÃ© box has arrived" },
];

function relativePosition(index: number, active: number) {
  let difference = index - active;
  if (difference > meals.length / 2) difference -= meals.length;
  if (difference < -meals.length / 2) difference += meals.length;
  return difference;
}

function formatNaira(value: number) {
  return `â‚¦${value.toLocaleString("en-NG")}`;
}

function formatCountdown(value: number) {
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatOrderDate(value: number) {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(value);
}

function calculatePercentageDiscount(amount: number, percentage: number) {
  return Math.round((amount * percentage) / 100);
}

function getOrderStatus(order: ActiveOrder, now: number) {
  const elapsedSeconds = Math.max(0, (now - order.startedAt) / 1000);
  const progress = Math.min(1, elapsedSeconds / order.durationSeconds);
  return {
    progress,
    stage: progress >= 1 ? 3 : progress >= 0.62 ? 2 : progress >= 0.45 ? 1 : 0,
    displaySeconds: Math.max(0, Math.ceil(order.displayStartSeconds * (1 - progress))),
  };
}

export default function Dashboard() {
  const [active, setActive] = useState(0);
  const [screen, setScreen] = useState<
    "menu" | "orders" | "profile" | "details" | "cart" | "checkout" | "tracking"
  >("menu");
  const [cartReturnScreen, setCartReturnScreen] = useState<
    "menu" | "orders" | "profile" | "details"
  >("menu");
  const [quantity, setQuantity] = useState(1);
  const [spice, setSpice] = useState(0);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [flight, setFlight] = useState<Flight | null>(null);
  const [cartBump, setCartBump] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<1 | 2>(1);
  const [promoCode, setPromoCode] = useState("");
  const [promoStatus, setPromoStatus] = useState<"idle" | "applied" | "error">("idle");
  const [paymentMethod, setPaymentMethod] = useState<"wallet" | "transfer" | "card">(
    "wallet",
  );
  const [delivery, setDelivery] = useState({
    name: "Juwon",
    phone: "",
    address: "",
    city: "Lagos",
    notes: "",
  });
  const [savedDelivery, setSavedDelivery] = useState<typeof delivery | null>(null);
  const [addressPreview, setAddressPreview] = useState(false);
  const [profileName, setProfileName] = useState("Juwon");
  const [profileEditing, setProfileEditing] = useState(false);
  const [avatarSrc, setAvatarSrc] = useState("/profile-avatar.png");
  const [notifications, setNotifications] = useState({
    orderUpdates: true,
    offers: true,
    reminders: false,
  });
  const [addressError, setAddressError] = useState("");
  const [checkoutNotice, setCheckoutNotice] = useState("");
  const [wheelOpen, setWheelOpen] = useState(false);
  const [spinsLeft, setSpinsLeft] = useState(3);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [wheelSpinning, setWheelSpinning] = useState(false);
  const [wheelResult, setWheelResult] = useState<WheelReward | null>(null);
  const [pendingWheelReward, setPendingWheelReward] = useState<WheelReward | null>(null);
  const [appliedWheelReward, setAppliedWheelReward] = useState<WheelReward | null>(null);
  const [activeOrders, setActiveOrders] = useState<ActiveOrder[]>([]);
  const [orderHistory, setOrderHistory] = useState<CompletedOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [trackingOrigin, setTrackingOrigin] = useState<
    "confirmation" | "menu" | "orders" | "cart"
  >("confirmation");
  const [orderClock, setOrderClock] = useState(() => Date.now());
  const dragStart = useRef<number | null>(null);
  const cartRef = useRef<HTMLButtonElement>(null);
  const detailProductRef = useRef<HTMLImageElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const meal = meals[active];
  const spiceIndex = Math.min(
    spiceLevels.length - 1,
    Math.round(spice / (100 / (spiceLevels.length - 1))),
  );
  const selectedSpice = spiceLevels[spiceIndex];
  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);
  const subtotal = cartItems.reduce(
    (total, item) => total + meals[item.mealIndex].price * item.quantity,
    0,
  );
  const discount =
    promoStatus === "applied"
      ? calculatePercentageDiscount(subtotal, PROMO_DISCOUNT_PERCENT)
      : 0;
  const wheelDiscount =
    promoStatus !== "applied" && appliedWheelReward?.discount
      ? calculatePercentageDiscount(subtotal, appliedWheelReward.discount)
    : 0;
  const deliveryFee =
    promoStatus !== "applied" && appliedWheelReward?.freeDelivery ? 0 : 400;
  const appliedDiscount = discount || wheelDiscount;
  const discountedSubtotal = Math.max(0, subtotal - appliedDiscount);
  const orderTotal = discountedSubtotal + deliveryFee;
  const estimatedMinutes =
    cartItems.length > 0
      ? Math.max(...cartItems.map((item) => meals[item.mealIndex].minutes))
      : 0;
  const selectedOrder =
    activeOrders.find((order) => order.id === selectedOrderId) ??
    orderHistory.find((order) => order.id === selectedOrderId) ??
    activeOrders[0] ??
    null;
  const selectedOrderStatus = selectedOrder
    ? getOrderStatus(selectedOrder, orderClock)
    : null;
  const trackingMeal = meals[selectedOrder?.mealIndex ?? 0];
  const trackingStage = selectedOrderStatus?.stage ?? 0;
  const trackingDisplaySeconds = selectedOrderStatus?.displaySeconds ?? 0;

  useEffect(() => {
    if (activeOrders.length === 0) return;
    const interval = window.setInterval(() => setOrderClock(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [activeOrders.length]);

  useEffect(() => {
    const completed = activeOrders.filter(
      (order) => getOrderStatus(order, orderClock).progress >= 1,
    );
    if (completed.length === 0) return;

    const completedIds = new Set(completed.map((order) => order.id));
    setActiveOrders((orders) => orders.filter((order) => !completedIds.has(order.id)));
    setOrderHistory((history) => {
      const existingIds = new Set(history.map((order) => order.id));
      const newlyCompleted = completed
        .filter((order) => !existingIds.has(order.id))
        .map((order) => ({ ...order, completedAt: order.startedAt + order.durationSeconds * 1000 }));
      return [...newlyCompleted, ...history];
    });
  }, [activeOrders, orderClock]);

  useEffect(() => {
    const storedHistory = window.localStorage.getItem("indomie-cafe-order-history");
    if (!storedHistory) return;

    try {
      const parsedHistory = JSON.parse(storedHistory) as CompletedOrder[];
      if (Array.isArray(parsedHistory)) setOrderHistory(parsedHistory);
    } catch {
      window.localStorage.removeItem("indomie-cafe-order-history");
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      "indomie-cafe-order-history",
      JSON.stringify(orderHistory),
    );
  }, [orderHistory]);

  useEffect(() => {
    const storedProfile = window.localStorage.getItem("indomie-cafe-profile");
    if (!storedProfile) return;

    try {
      const profile = JSON.parse(storedProfile);
      if (profile.name) setProfileName(profile.name);
      if (profile.avatar) setAvatarSrc(profile.avatar);
      if (profile.delivery) {
        setSavedDelivery(profile.delivery);
        setDelivery(profile.delivery);
        setAddressPreview(true);
      }
      if (profile.notifications) setNotifications(profile.notifications);
    } catch {
      window.localStorage.removeItem("indomie-cafe-profile");
    }
  }, []);

  const persistProfile = (
    nextName = profileName,
    nextDelivery = savedDelivery,
    nextAvatar = avatarSrc,
    nextNotifications = notifications,
  ) => {
    window.localStorage.setItem(
      "indomie-cafe-profile",
      JSON.stringify({
        name: nextName,
        delivery: nextDelivery,
        avatar: nextAvatar,
        notifications: nextNotifications,
      }),
    );
  };

  const move = (direction: number) => {
    setActive((current) => (current + direction + meals.length) % meals.length);
  };

  const openDetails = () => {
    setQuantity(1);
    setSpice(0);
    setScreen("details");
  };

  const openCart = () => {
    if (screen === "cart") return;
    if (screen === "checkout") {
      setScreen("cart");
      return;
    }
    setCartReturnScreen(
      screen === "details"
        ? "details"
        : screen === "orders"
          ? "orders"
          : screen === "profile"
            ? "profile"
            : "menu",
    );
    setScreen("cart");
  };

  const addToOrder = () => {
    if (flight || !cartRef.current || !detailProductRef.current) return;

    const product = detailProductRef.current.getBoundingClientRect();
    const cart = cartRef.current.getBoundingClientRect();
    const x = cart.left + cart.width / 2 - (product.left + product.width / 2);
    const y = cart.top + cart.height / 2 - (product.top + product.height / 2);

    setFlight({
      image: meal.image,
      left: product.left,
      top: product.top,
      width: product.width,
      height: product.height,
      x,
      y,
      midX: x * 0.5,
      midY: y * 0.38 - 42,
    });
  };

  const finishOrderAnimation = () => {
    setFlight(null);
    const id = `${active}-${spiceIndex}`;
    setCartItems((items) => {
      const existing = items.find((item) => item.id === id);
      if (existing) {
        return items.map((item) =>
          item.id === id ? { ...item, quantity: item.quantity + quantity } : item,
        );
      }
      return [...items, { id, mealIndex: active, quantity, spiceIndex }];
    });
    setCartBump(true);
    window.setTimeout(() => setCartBump(false), 420);
  };

  const changeCartQuantity = (id: string, amount: number) => {
    setCartItems((items) =>
      items.map((item) =>
        item.id === id
          ? { ...item, quantity: Math.max(1, Math.min(20, item.quantity + amount)) }
          : item,
      ),
    );
  };

  const removeCartItem = (id: string) => {
    setCartItems((items) => items.filter((item) => item.id !== id));
  };

  const showNotice = (message: string) => {
    setCheckoutNotice(message);
    window.setTimeout(() => setCheckoutNotice(""), 2400);
  };

  const openCheckout = () => {
    setCheckoutStep(1);
    setAddressError("");
    if (savedDelivery) {
      setDelivery(savedDelivery);
      setAddressPreview(true);
    } else {
      setAddressPreview(false);
    }
    setScreen("checkout");
  };

  const saveDeliveryAddress = () => {
    if (!delivery.name.trim() || !delivery.phone.trim() || !delivery.address.trim()) {
      setAddressError("Please add your name, phone number, and delivery address.");
      return;
    }
    const nextDelivery = { ...delivery };
    setAddressError("");
    setSavedDelivery(nextDelivery);
    setAddressPreview(true);
    setProfileName(nextDelivery.name);
    persistProfile(nextDelivery.name, nextDelivery);
    showNotice("Delivery address saved for next time.");
  };

  const saveProfile = () => {
    const nextName = profileName.trim() || "Juwon";
    setProfileName(nextName);
    setDelivery((value) => ({ ...value, name: nextName }));
    if (savedDelivery) {
      const nextDelivery = { ...savedDelivery, name: nextName };
      setSavedDelivery(nextDelivery);
      persistProfile(nextName, nextDelivery);
    } else {
      persistProfile(nextName);
    }
    setProfileEditing(false);
    showNotice("Profile updated.");
  };

  const updateNotification = (key: keyof typeof notifications) => {
    const nextNotifications = { ...notifications, [key]: !notifications[key] };
    setNotifications(nextNotifications);
    persistProfile(profileName, savedDelivery, avatarSrc, nextNotifications);
  };

  const changeAvatar = (file?: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const nextAvatar = String(reader.result);
      setAvatarSrc(nextAvatar);
      persistProfile(profileName, savedDelivery, nextAvatar);
      showNotice("Profile picture updated.");
    };
    reader.readAsDataURL(file);
  };

  const applyPromo = () => {
    if (promoCode.trim().toUpperCase() === PROMO_CODE) {
      const replacedWheelReward = Boolean(appliedWheelReward);
      setAppliedWheelReward(null);
      setPromoStatus("applied");
      showNotice(
        replacedWheelReward
          ? "Promo applied â€” it replaced your wheel reward."
          : "Promo applied â€” you saved 20%.",
      );
    } else {
      setPromoStatus("error");
    }
  };

  const openWheel = () => {
    setWheelResult(null);
    setWheelOpen(true);
  };

  const spinWheel = () => {
    if (wheelSpinning || spinsLeft <= 0) return;

    const replacedPromo = promoStatus === "applied";
    setPromoCode("");
    setPromoStatus("idle");
    setAppliedWheelReward(null);
    if (replacedPromo) showNotice("Your wheel spin replaced the promo code.");

    const roll = Math.random() * 100;
    let runningWeight = 0;
    let rewardIndex = 0;
    for (let index = 0; index < wheelRewards.length; index += 1) {
      runningWeight += wheelRewards[index].weight;
      if (roll < runningWeight) {
        rewardIndex = index;
        break;
      }
    }

    const reward = wheelRewards[rewardIndex];
    const normalizedRotation = ((wheelRotation % 360) + 360) % 360;
    const desiredRotation = (360 - rewardIndex * 60) % 360;
    const alignment = (desiredRotation - normalizedRotation + 360) % 360;

    setWheelResult(null);
    setPendingWheelReward(reward);
    setWheelSpinning(true);
    setSpinsLeft((value) => value - 1);
    setWheelRotation((value) => value + 360 * 7 + alignment);
  };

  const finishWheelSpin = () => {
    if (!wheelSpinning || !pendingWheelReward) return;
    setWheelSpinning(false);
    setWheelResult(pendingWheelReward);
    if (pendingWheelReward.extraSpin) {
      setSpinsLeft((value) => value + 1);
    }
    setPendingWheelReward(null);
  };

  const applyWheelReward = () => {
    if (!wheelResult) return;
    if (wheelResult.discount || wheelResult.freeDelivery) {
      setPromoCode("");
      setPromoStatus("idle");
      setAppliedWheelReward(wheelResult);
      showNotice(`${wheelResult.label} applied to your order.`);
      setWheelOpen(false);
      return;
    }
    if (spinsLeft > 0) {
      setWheelResult(null);
    } else {
      setWheelOpen(false);
    }
  };

  const handleBack = () => {
    if (screen === "checkout") {
      if (checkoutStep === 2) {
        setCheckoutStep(1);
      } else {
        setScreen("cart");
      }
      return;
    }
    setScreen(screen === "cart" ? cartReturnScreen : "menu");
  };

  const continueToDelivery = () => {
    setCheckoutStep(2);
    document.querySelector(".app-shell")?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goToDashboard = () => {
    setScreen("menu");
    setCheckoutStep(1);
    setWheelOpen(false);
    setPromoCode("");
    setPromoStatus("idle");
    setAppliedWheelReward(null);
  };

  const chooseTrackedOrder = (orderId: string, origin: "menu" | "cart") => {
    if (selectedOrderId === orderId) {
      setTrackingOrigin(origin);
      setScreen("tracking");
      return;
    }
    setSelectedOrderId(orderId);
  };

  const openOrderDetails = (orderId: string) => {
    setSelectedOrderId(orderId);
    setTrackingOrigin("orders");
    setScreen("tracking");
  };

  const exitTracking = () => {
    setScreen(
      trackingOrigin === "orders"
        ? "orders"
        : trackingOrigin === "cart"
          ? "cart"
          : "menu",
    );
  };

  const placeOrder = () => {
    if (!delivery.name.trim() || !delivery.phone.trim() || !delivery.address.trim()) {
      setAddressError("Please add your name, phone number, and delivery address.");
      return;
    }
    setAddressError("");
    const orderedMealIndex = cartItems[0]?.mealIndex ?? active;
    const durationSeconds = Math.max(60, (meals[orderedMealIndex].minutes - 5) * 60);
    const orderId = `IC-${String(Date.now()).slice(-6)}`;
    const nextOrder: ActiveOrder = {
      id: orderId,
      mealIndex: orderedMealIndex,
      items: cartItems.map((item) => ({ ...item })),
      total: orderTotal,
      startedAt: Date.now(),
      durationSeconds,
      displa…8374 tokens truncated…checkout-progress" aria-label={`Checkout step ${checkoutStep} of 2`}>
            <div className="is-complete">
              <span>{checkoutStep > 1 ? "âœ“" : "1"}</span>
              <strong>Review</strong>
            </div>
            <i className={checkoutStep === 2 ? "is-complete" : ""} />
            <div className={checkoutStep === 2 ? "is-complete" : ""}>
              <span>2</span>
              <strong>Delivery</strong>
            </div>
          </div>

          {checkoutStep === 1 ? (
            <>
              <div className="checkout-heading">
                <p>Step 1 of 2</p>
                <h2 id="checkout-heading">Review your order</h2>
                <span>Confirm your boxes and unlock a cafÃ© discount.</span>
              </div>

              <div className="checkout-order-list">
                {cartItems.map((item) => {
                  const checkoutMeal = meals[item.mealIndex];
                  return (
                    <div className="checkout-order-item" key={item.id}>
                      <img src={checkoutMeal.image} alt="" aria-hidden="true" />
                      <div>
                        <strong>{checkoutMeal.name}</strong>
                        <span>
                          {item.quantity} Ã— {formatNaira(checkoutMeal.price)}
                        </span>
                      </div>
                      <strong>{formatNaira(checkoutMeal.price * item.quantity)}</strong>
                    </div>
                  );
                })}
              </div>

              <section className="promo-card" aria-labelledby="promo-heading">
                <div>
                  <span className="promo-spark" aria-hidden="true">âœ¦</span>
                  <div>
                    <h3 id="promo-heading">Have a promo code?</h3>
                    <p>Enter it below to save on this order.</p>
                  </div>
                </div>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    applyPromo();
                  }}
                >
                  <input
                    type="text"
                    value={promoCode}
                    placeholder="Enter promo code"
                    aria-label="Promo code"
                    onChange={(event) => {
                      setPromoCode(event.target.value);
                      if (promoStatus !== "idle") setPromoStatus("idle");
                    }}
                  />
                  <button type="submit">Apply</button>
                </form>
                {promoStatus === "applied" && (
                  <p className="promo-feedback success">
                    {PROMO_DISCOUNT_PERCENT}% applied: you saved {formatNaira(discount)}.
                    Food total is now {formatNaira(discountedSubtotal)}.
                  </p>
                )}
                {promoStatus === "error" && (
                  <p className="promo-feedback error">
                    That code is not valid. Try INDOMIECAFE.
                  </p>
                )}
              </section>

              <button
                className="spin-card"
                type="button"
                onClick={openWheel}
              >
                <span className="mini-prize-wheel" aria-hidden="true">
                  <i />
                  <b />
                </span>
                <span>
                  <strong>Spin to Win</strong>
                  <small>
                    {appliedWheelReward
                      ? `${appliedWheelReward.label} applied`
                      : `${spinsLeft} ${spinsLeft === 1 ? "spin" : "spins"} available`}
                  </small>
                </span>
                <b aria-hidden="true">â†’</b>
              </button>
              <p className="reward-rule">
                Promo codes and wheel rewards cannot be combined. Your latest choice
                replaces the previous one.
              </p>

              <section className="checkout-totals" aria-label="Price summary">
                <div>
                  <span>Subtotal</span>
                  <strong>{formatNaira(subtotal)}</strong>
                </div>
                <div className={discount > 0 ? "discount-line" : ""}>
                  <span>Promo discount ({PROMO_DISCOUNT_PERCENT}%)</span>
                  <strong>{discount > 0 ? `âˆ’${formatNaira(discount)}` : "â€”"}</strong>
                </div>
                <div className={wheelDiscount > 0 ? "discount-line" : ""}>
                  <span>Spin reward</span>
                  <strong>
                    {wheelDiscount > 0
                      ? `âˆ’${formatNaira(wheelDiscount)}`
                      : appliedWheelReward?.freeDelivery
                        ? "Free delivery"
                        : "â€”"}
                  </strong>
                </div>
                <div className={deliveryFee === 0 ? "discount-line" : ""}>
                  <span>Delivery</span>
                  <strong>{deliveryFee === 0 ? "FREE" : formatNaira(deliveryFee)}</strong>
                </div>
                <div>
                  <span>Total</span>
                  <strong>{formatNaira(orderTotal)}</strong>
                </div>
              </section>

              <div className="fixed-cta-container">
                <button className="checkout-next" type="button" onClick={continueToDelivery}>
                  <span>Next: delivery details</span>
                  <span aria-hidden="true">â†’</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="checkout-heading">
                <p>Step 2 of 2</p>
                <h2 id="checkout-heading">Where should we deliver?</h2>
                <span>Add your address, then choose how you would like to pay.</span>
              </div>

              <section className="delivery-card" aria-labelledby="delivery-heading">
                <div className="checkout-delivery-heading">
                  <h3 id="delivery-heading">Delivery details</h3>
                  {addressPreview && savedDelivery && (
                    <button type="button" onClick={() => setAddressPreview(false)}>
                      Edit
                    </button>
                  )}
                </div>
                {addressPreview && savedDelivery ? (
                  <div className="checkout-address-preview">
                    <span aria-hidden="true">âŒ‚</span>
                    <div>
                      <strong>{savedDelivery.name}</strong>
                      <p>{savedDelivery.address}</p>
                      <small>
                        {savedDelivery.city} Â· {savedDelivery.phone}
                      </small>
                    </div>
                    <i aria-hidden="true">Saved</i>
                  </div>
                ) : (
                  <>
                    <div className="form-grid">
                      <label>
                        <span>Full name</span>
                        <input
                          type="text"
                          value={delivery.name}
                          placeholder="Your full name"
                          onChange={(event) =>
                            setDelivery((value) => ({ ...value, name: event.target.value }))
                          }
                        />
                      </label>
                      <label>
                        <span>Phone number</span>
                        <input
                          type="tel"
                          value={delivery.phone}
                          placeholder="+234"
                          onChange={(event) =>
                            setDelivery((value) => ({ ...value, phone: event.target.value }))
                          }
                        />
                      </label>
                      <label className="full-width">
                        <span>Delivery address</span>
                        <textarea
                          value={delivery.address}
                          placeholder="Street, house number, and nearest landmark"
                          rows={3}
                          onChange={(event) =>
                            setDelivery((value) => ({
                              ...value,
                              address: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <label>
                        <span>City</span>
                        <input
                          type="text"
                          value={delivery.city}
                          onChange={(event) =>
                            setDelivery((value) => ({ ...value, city: event.target.value }))
                          }
                        />
                      </label>
                      <label>
                        <span>Delivery note</span>
                        <input
                          type="text"
                          value={delivery.notes}
                          placeholder="Optional"
                          onChange={(event) =>
                            setDelivery((value) => ({ ...value, notes: event.target.value }))
                          }
                        />
                      </label>
                    </div>
                    {addressError && <p className="address-error">{addressError}</p>}
                    <button
                      className="save-checkout-address"
                      type="button"
                      onClick={saveDeliveryAddress}
                    >
                      Save address for next time
                    </button>
                  </>
                )}
              </section>

              <section className="payment-card" aria-labelledby="payment-heading">
                <div className="payment-heading">
                  <h3 id="payment-heading">Payment method</h3>
                  <strong>{formatNaira(orderTotal)}</strong>
                </div>
                <div className="payment-options">
                  <button
                    className={paymentMethod === "wallet" ? "is-selected" : ""}
                    type="button"
                    onClick={() => setPaymentMethod("wallet")}
                  >
                    <span className="payment-icon wallet-icon" aria-hidden="true">â‚¦</span>
                    <span>
                      <strong>Indomie Wallet</strong>
                      <small>Balance Â· â‚¦50,000</small>
                    </span>
                    <i aria-hidden="true" />
                  </button>
                  <button
                    className={paymentMethod === "transfer" ? "is-selected" : ""}
                    type="button"
                    onClick={() => setPaymentMethod("transfer")}
                  >
                    <span className="payment-icon" aria-hidden="true">â†—</span>
                    <span>
                      <strong>Bank transfer</strong>
                      <small>Pay from any Nigerian bank</small>
                    </span>
                    <i aria-hidden="true" />
                  </button>
                  <button
                    className={paymentMethod === "card" ? "is-selected" : ""}
                    type="button"
                    onClick={() => setPaymentMethod("card")}
                  >
                    <span className="payment-icon card-icon" aria-hidden="true" />
                    <span>
                      <strong>Debit card</strong>
                      <small>Visa, Mastercard, or Verve</small>
                    </span>
                    <i aria-hidden="true" />
                  </button>
                </div>
              </section>

              <div className="fixed-cta-container">
                <button className="checkout-next place-order" type="button" onClick={placeOrder}>
                  <span>Place order Â· {formatNaira(orderTotal)}</span>
                  <span aria-hidden="true">â†’</span>
                </button>
              </div>
            </>
          )}
        </section>
      ) : (
        <section className="tracking-content" aria-labelledby="tracking-heading">
          <div className="tracking-copy">
            <p>Order confirmed</p>
            <h2 id="tracking-heading">{orderStages[trackingStage].name}</h2>
            <span>{orderStages[trackingStage].note}</span>
          </div>

          <div className="preparation-visual" aria-label="Your meal being prepared">
            <div className="prep-glow" aria-hidden="true" />
            <img
              src={trackingMeal.image}
              alt={`${trackingMeal.name} being prepared`}
            />
            <div className="prep-live-pill">
              <i aria-hidden="true" />
              Live from the kitchen
            </div>
          </div>

          <div className="tracking-order-meta">
            <span>Order #{selectedOrder?.id ?? "IC"}</span>
            <strong>{selectedOrder ? formatNaira(selectedOrder.total) : trackingMeal.name}</strong>
          </div>

          {selectedOrder && (
            <div className="tracking-items" aria-label="Items in this order">
              {selectedOrder.items.map((item) => {
                const orderedMeal = meals[item.mealIndex];
                return (
                  <div key={item.id}>
                    <img src={orderedMeal.image} alt="" aria-hidden="true" />
                    <span>
                      <strong>{orderedMeal.name}</strong>
                      <small>
                        {item.quantity} Ã— {formatNaira(orderedMeal.price)} Â·{" "}
                        {spiceLevels[item.spiceIndex].name}
                      </small>
                    </span>
                    <b>{formatNaira(orderedMeal.price * item.quantity)}</b>
                  </div>
                );
              })}
            </div>
          )}

          <ol className="tracking-timeline" aria-label="Order progress">
            {orderStages.map((stage, index) => (
              <li
                key={stage.name}
                className={
                  index < trackingStage
                    ? "is-complete"
                    : index === trackingStage
                      ? "is-active"
                      : ""
                }
                aria-current={index === trackingStage ? "step" : undefined}
              >
                <span>{index < trackingStage ? "âœ“" : index + 1}</span>
                <div>
                  <strong>{stage.name}</strong>
                  <small>{stage.note}</small>
                </div>
              </li>
            ))}
          </ol>

          <div className="tracking-estimate">
            <span>{trackingStage === 3 ? "Order complete" : "Estimated arrival"}</span>
            <strong>
              {trackingStage === orderStages.length - 1
                ? "Delivered"
                : `${formatCountdown(trackingDisplaySeconds)} remaining`}
            </strong>
          </div>

          {trackingOrigin === "confirmation" && (
            <div className="fixed-cta-container">
              <button className="tracking-dashboard" type="button" onClick={goToDashboard}>
                <span>Go back to dashboard</span>
                <span aria-hidden="true">â†’</span>
              </button>
            </div>
          )}
        </section>
      )}

      {flight && (
        <img
          className="flying-meal"
          src={flight.image}
          alt=""
          aria-hidden="true"
          style={
            {
              left: flight.left,
              top: flight.top,
              width: flight.width,
              height: flight.height,
              "--fly-x": `${flight.x}px`,
              "--fly-y": `${flight.y}px`,
              "--fly-mid-x": `${flight.midX}px`,
              "--fly-mid-y": `${flight.midY}px`,
            } as React.CSSProperties
          }
          onAnimationEnd={finishOrderAnimation}
        />
      )}

      {wheelOpen && (
        <div
          className="wheel-backdrop"
          onClick={() => {
            if (!wheelSpinning) setWheelOpen(false);
          }}
        >
          <section
            className="wheel-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="wheel-heading"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="wheel-close"
              type="button"
              aria-label="Close Spin to Win"
              disabled={wheelSpinning}
              onClick={() => setWheelOpen(false)}
            >
              Ã—
            </button>

            <div className="wheel-modal-heading">
              <p>Indomie CafÃ© rewards</p>
              <h2 id="wheel-heading">Spin to Win</h2>
              <span>
                {spinsLeft} {spinsLeft === 1 ? "spin" : "spins"} remaining
              </span>
            </div>

            <div className={`prize-wheel-stage ${wheelSpinning ? "is-spinning" : ""}`}>
              <div className="wheel-pointer" aria-hidden="true" />
              <div
                className="prize-wheel"
                style={{ transform: `rotate(${wheelRotation}deg)` }}
                onTransitionEnd={finishWheelSpin}
              >
                {wheelRewards.map((reward, index) => (
                  <span
                    key={reward.id}
                    style={{ "--segment": index } as React.CSSProperties}
                  >
                    <b>{reward.shortLabel}</b>
                  </span>
                ))}
                <i className="wheel-hub" aria-hidden="true">
                  IN
                </i>
              </div>
            </div>

            {wheelResult ? (
              <div className="wheel-result">
                <span aria-hidden="true">
                  {wheelResult.discount
                    ? "%"
                    : wheelResult.freeDelivery
                      ? "âœ“"
                      : wheelResult.extraSpin
                        ? "â†»"
                        : "â€¢"}
                </span>
                <div>
                  <small>{wheelResult.id === "nothing" ? "So close!" : "You won"}</small>
                  <h3>{wheelResult.label}</h3>
                </div>
                <button type="button" onClick={applyWheelReward}>
                  {wheelResult.discount || wheelResult.freeDelivery
                    ? "Apply reward"
                    : spinsLeft > 0
                      ? "Spin again"
                      : "Done"}
                </button>
              </div>
            ) : (
              <button
                className="spin-action"
                type="button"
                disabled={wheelSpinning || spinsLeft <= 0}
                onClick={spinWheel}
              >
                {wheelSpinning
                  ? "Spinning..."
                  : spinsLeft > 0
                    ? "Spin the wheel"
                    : "No spins remaining"}
              </button>
            )}

            <p className="wheel-odds">
              Free delivery and 10% off are the most common wins. The 40% prize is rare.
            </p>
          </section>
        </div>
      )}

      <div className="sr-only" aria-live="polite">
        {cartBump ? `${quantity} ${meal.name} added to your order` : ""}
      </div>

      <div
        className={`checkout-toast ${checkoutNotice ? "is-visible" : ""}`}
        role="status"
        aria-live="polite"
      >
        {checkoutNotice}
      </div>
    </main>
  );
}

