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
const PROMO_DISCOUNT_PERCENT = 25;

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
    eyebrow: "Café signature",
    description:
      "A rich, savoury mix of Indomie, gizzard, plantain, peppers, and signature café seasoning.",
    minutes: 15,
    calories: 610,
    price: 4600,
  },
  {
    name: "Sausage Indomie",
    image: "/sausage-indomie.png",
    eyebrow: "Classic comfort",
    description:
      "The café classic loaded with savoury sausage bites, vegetables, and aromatic spices.",
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
  { name: "Dispatched", note: "Your order has left the café" },
  { name: "On the way", note: "Your rider is heading to you" },
  { name: "Delivered", note: "Your Indomie Café box has arrived" },
];

function relativePosition(index: number, active: number) {
  let difference = index - active;
  if (difference > meals.length / 2) difference -= meals.length;
  if (difference < -meals.length / 2) difference += meals.length;
  return difference;
}

function formatNaira(value: number) {
  return `₦${value.toLocaleString("en-NG")}`;
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
  const safeAmount = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  const safePercentage = Number.isFinite(percentage)
    ? Math.max(0, Math.min(100, percentage))
    : 0;

  return Math.round(safeAmount * (safePercentage / 100));
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
          ? "Promo applied — it replaced your wheel reward."
          : `Promo applied — you saved ${PROMO_DISCOUNT_PERCENT}%.`,
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
      displayStartSeconds: meals[orderedMealIndex].minutes * 60 + 36,
    };
    setActiveOrders((orders) => [...orders, nextOrder]);
    setSelectedOrderId(orderId);
    setTrackingOrigin("confirmation");
    setOrderClock(Date.now());
    setCartItems([]);
    setScreen("tracking");
    document.querySelector(".app-shell")?.scrollTo({ top: 0 });
  };

  return (
    <main className={`app-shell ${screen !== "menu" ? "showing-scrollable" : ""}`}>
      <header
        className={`top-header ${
          screen !== "menu" && screen !== "orders" && screen !== "profile"
            ? "detail-header"
            : ""
        }`}
      >
        {screen === "menu" || screen === "orders" || screen === "profile" ? (
          <img
            className="brand-logo"
            src="/indomie-cafe-logo.png"
            alt="Indomie Café"
          />
        ) : screen === "tracking" ? (
          <button
            className="header-circle back-button tracking-close"
            type="button"
            aria-label={
              trackingOrigin === "confirmation"
                ? "Close order status and return to dashboard"
                : `Back to ${trackingOrigin}`
            }
            onClick={trackingOrigin === "confirmation" ? goToDashboard : exitTracking}
          >
            <span aria-hidden="true">
              {trackingOrigin === "confirmation" ? "×" : "←"}
            </span>
          </button>
        ) : (
          <button
            className="header-circle back-button"
            type="button"
            aria-label="Back"
            onClick={handleBack}
          >
            <span aria-hidden="true">←</span>
          </button>
        )}

        {screen !== "menu" && screen !== "orders" && screen !== "profile" && (
          <h1>
            {screen === "cart"
              ? "Your Cart"
              : screen === "checkout"
                ? "Checkout"
                : screen === "tracking"
                  ? "Order status"
                  : meal.name}
          </h1>
        )}

        {screen === "tracking" ? (
          <span className="header-spacer" aria-hidden="true" />
        ) : (
          <button
            ref={cartRef}
            className={`header-circle cart-button ${cartBump ? "is-bumping" : ""} ${screen === "cart" || screen === "checkout" ? "is-current" : ""}`}
            type="button"
            aria-label={`Open cart, ${cartCount} items`}
            onClick={openCart}
          >
            <img src="/shopping-cart.svg" alt="" aria-hidden="true" />
            {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
          </button>
        )}
      </header>

      {screen === "menu" ? (
        <>
          <section
            className={`dashboard-content ${activeOrders.length > 0 ? "has-active-order" : ""}`}
          >
            <div className="welcome">
              <p className="greeting">Good Morning</p>
              <h1>
                Juwon <span aria-hidden="true">{"\u{1F44B}"}</span>
              </h1>
              <p className="prompt">What would you like to have today?</p>
            </div>

            <div
              className="carousel"
              role="region"
              aria-roledescription="carousel"
              aria-label="Noodle menu"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "ArrowRight") move(1);
                if (event.key === "ArrowLeft") move(-1);
              }}
              onPointerDown={(event) => {
                dragStart.current = event.clientX;
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerUp={(event) => {
                if (dragStart.current === null) return;
                const distance = event.clientX - dragStart.current;
                if (Math.abs(distance) > 42) move(distance < 0 ? 1 : -1);
                dragStart.current = null;
              }}
              onPointerCancel={() => {
                dragStart.current = null;
              }}
            >
              <div className="carousel-stage">
                {meals.map((item, index) => {
                  const position = relativePosition(index, active);
                  const distance = Math.abs(position);
                  return (
                    <article
                      className={`meal-card ${position === 0 ? "is-active" : ""}`}
                      key={item.name}
                      style={
                        {
                          "--position": position,
                          "--card-scale": position === 0 ? 1 : distance === 1 ? 0.7 : 0.45,
                          "--card-opacity": position === 0 ? 1 : distance === 1 ? 0.44 : 0,
                          "--card-blur": position === 0 ? "0px" : "0.3px",
                        } as React.CSSProperties
                      }
                      aria-hidden={position !== 0}
                    >
                      <div className="meal-image-wrap">
                        <span className="meal-glow" />
                        <img
                          className="meal-image"
                          src={item.image}
                          alt={position === 0 ? `${item.name} noodle box` : ""}
                          draggable={false}
                        />
                      </div>
                      <p className="meal-eyebrow">{item.eyebrow}</p>
                      <h2>{item.name}</h2>
                    </article>
                  );
                })}
              </div>

            </div>

            <div className="carousel-controls">
              <div className="carousel-dots" aria-label="Choose a noodle box">
                {meals.map((item, index) => (
                  <button
                    key={item.name}
                    type="button"
                    className={index === active ? "dot is-active" : "dot"}
                    aria-label={`Show ${item.name}`}
                    aria-current={index === active ? "true" : undefined}
                    onClick={() => setActive(index)}
                  />
                ))}
              </div>

              <button className="view-box" type="button" onClick={openDetails}>
                <span>View Box</span>
                <span className="arrow" aria-hidden="true">
                  →
                </span>
              </button>
            </div>

            {activeOrders.length > 0 && (
              <div className="active-order-stack" aria-label="Active orders">
                {activeOrders.map((order) => {
                  const status = getOrderStatus(order, orderClock);
                  const isSelected = selectedOrder?.id === order.id;
                  return (
                    <button
                      key={order.id}
                      className={isSelected ? "is-selected" : ""}
                      type="button"
                      aria-label={`${meals[order.mealIndex].name}, ${orderStages[status.stage].name}`}
                      onClick={() => chooseTrackedOrder(order.id, "menu")}
                    >
                      <img src={meals[order.mealIndex].image} alt="" aria-hidden="true" />
                      <span>
                        <small>{order.id}</small>
                        <strong>{orderStages[status.stage].name}</strong>
                      </span>
                      {isSelected && (
                        <b>
                          {status.stage === 3
                            ? "View"
                            : formatCountdown(status.displaySeconds)}
                        </b>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <nav className="bottom-nav" aria-label="Primary navigation">
            <button className="nav-item is-active" type="button" aria-current="page">
              <img src="/bowl-food.svg" alt="" aria-hidden="true" />
              <span>Menu</span>
            </button>
            <button className="nav-item" type="button" onClick={() => setScreen("orders")}>
              <img src="/shopping-cart.svg" alt="" aria-hidden="true" />
              <span>Orders</span>
              {activeOrders.length > 0 && (
                <b className="nav-order-count">{activeOrders.length}</b>
              )}
            </button>
            <button className="nav-item" type="button" onClick={() => setScreen("profile")}>
              <img
                className="profile-avatar"
                src={avatarSrc}
                alt=""
                aria-hidden="true"
              />
              <span>Profile</span>
            </button>
          </nav>
        </>
      ) : screen === "orders" ? (
        <>
          <section className="orders-content" aria-labelledby="orders-heading">
            <div className="orders-heading">
              <p>Indomie Café</p>
              <h2 id="orders-heading">Your orders</h2>
              <span>Track every box from the kitchen to your door.</span>
            </div>

            {activeOrders.length > 0 || orderHistory.length > 0 ? (
              <div className="orders-groups">
                {activeOrders.length > 0 && (
                  <section className="orders-group" aria-labelledby="active-orders-heading">
                    <div className="orders-group-heading">
                      <h3 id="active-orders-heading">In progress</h3>
                      <span>{activeOrders.length} active</span>
                    </div>
                    <div className="orders-list">
                {activeOrders.map((order, index) => {
                  const status = getOrderStatus(order, orderClock);
                  const itemCount = order.items.reduce(
                    (total, item) => total + item.quantity,
                    0,
                  );
                  return (
                    <button
                      className="order-history-card"
                      type="button"
                      key={order.id}
                      onClick={() => openOrderDetails(order.id)}
                    >
                      <span className="order-sequence">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <img
                        src={meals[order.mealIndex].image}
                        alt=""
                        aria-hidden="true"
                      />
                      <span className="order-history-copy">
                        <small>{order.id}</small>
                        <strong>{meals[order.mealIndex].name}</strong>
                        <em>
                          {itemCount} {itemCount === 1 ? "box" : "boxes"} ·{" "}
                          {formatNaira(order.total)}
                        </em>
                      </span>
                      <span className="order-history-status">
                        <i aria-hidden="true" />
                        <strong>{orderStages[status.stage].name}</strong>
                        <small>
                          {status.stage === 3
                            ? "Complete"
                            : formatCountdown(status.displaySeconds)}
                        </small>
                      </span>
                    </button>
                  );
                      })}
                    </div>
                  </section>
                )}

                {orderHistory.length > 0 && (
                  <section className="orders-group" aria-labelledby="order-history-heading">
                    <div className="orders-group-heading">
                      <h3 id="order-history-heading">Order history</h3>
                      <span>{orderHistory.length} completed</span>
                    </div>
                    <div className="orders-list">
                      {orderHistory.map((order, index) => {
                        const itemCount = order.items.reduce(
                          (total, item) => total + item.quantity,
                          0,
                        );
                        return (
                          <button
                            className="order-history-card is-complete"
                            type="button"
                            key={order.id}
                            onClick={() => openOrderDetails(order.id)}
                          >
                            <span className="order-sequence">
                              {String(orderHistory.length - index).padStart(2, "0")}
                            </span>
                            <img
                              src={meals[order.mealIndex].image}
                              alt=""
                              aria-hidden="true"
                            />
                            <span className="order-history-copy">
                              <small>{order.id}</small>
                              <strong>{meals[order.mealIndex].name}</strong>
                              <em>
                                {itemCount} {itemCount === 1 ? "box" : "boxes"} ·{" "}
                                {formatNaira(order.total)}
                              </em>
                            </span>
                            <span className="order-history-status">
                              <i aria-hidden="true" />
                              <strong>Delivered</strong>
                              <small>{formatOrderDate(order.completedAt)}</small>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                )}
              </div>
            ) : (
              <div className="orders-empty">
                <img src="/bowl-food.svg" alt="" aria-hidden="true" />
                <h3>No orders yet</h3>
                <p>Your active and completed café orders will appear here.</p>
                <button type="button" onClick={() => setScreen("menu")}>
                  Explore the menu
                </button>
              </div>
            )}
          </section>

          <nav className="bottom-nav" aria-label="Primary navigation">
            <button className="nav-item" type="button" onClick={() => setScreen("menu")}>
              <img src="/bowl-food.svg" alt="" aria-hidden="true" />
              <span>Menu</span>
            </button>
            <button className="nav-item is-active" type="button" aria-current="page">
              <img src="/shopping-cart.svg" alt="" aria-hidden="true" />
              <span>Orders</span>
              {activeOrders.length > 0 && (
                <b className="nav-order-count">{activeOrders.length}</b>
              )}
            </button>
            <button className="nav-item" type="button" onClick={() => setScreen("profile")}>
              <img
                className="profile-avatar"
                src={avatarSrc}
                alt=""
                aria-hidden="true"
              />
              <span>Profile</span>
            </button>
          </nav>
        </>
      ) : screen === "profile" ? (
        <>
          <section className="profile-content" aria-labelledby="profile-heading">
            <div className="profile-heading">
              <p>My café</p>
              <h2 id="profile-heading">Profile</h2>
              <span>Keep your details ready for a faster checkout.</span>
            </div>

            <section className="profile-identity" aria-label="Profile identity">
              <button
                className="profile-photo-button"
                type="button"
                aria-label="Change profile picture"
                onClick={() => avatarInputRef.current?.click()}
              >
                <img src={avatarSrc} alt={`${profileName}'s profile`} />
                <span aria-hidden="true">+</span>
              </button>
              <input
                ref={avatarInputRef}
                className="sr-only"
                type="file"
                accept="image/*"
                onChange={(event) => changeAvatar(event.target.files?.[0])}
              />
              <div>
                {profileEditing ? (
                  <input
                    className="profile-name-input"
                    value={profileName}
                    aria-label="Profile name"
                    onChange={(event) => setProfileName(event.target.value)}
                  />
                ) : (
                  <>
                    <h3>{profileName}</h3>
                    <p>Indomie Café member</p>
                  </>
                )}
              </div>
              <button
                className="profile-edit-button"
                type="button"
                onClick={profileEditing ? saveProfile : () => setProfileEditing(true)}
              >
                {profileEditing ? "Save" : "Edit"}
              </button>
            </section>

            <section className="profile-section" aria-labelledby="saved-address-heading">
              <div className="profile-section-heading">
                <div>
                  <p>Delivery</p>
                  <h3 id="saved-address-heading">Saved address</h3>
                </div>
                {savedDelivery && addressPreview && (
                  <button
                    type="button"
                    onClick={() => {
                      setDelivery(savedDelivery);
                      setAddressPreview(false);
                    }}
                  >
                    Edit
                  </button>
                )}
              </div>

              {savedDelivery && addressPreview ? (
                <div className="profile-address-preview">
                  <span aria-hidden="true">⌂</span>
                  <div>
                    <strong>{savedDelivery.name}</strong>
                    <p>{savedDelivery.address}</p>
                    <small>
                      {savedDelivery.city} · {savedDelivery.phone}
                    </small>
                  </div>
                  <i aria-hidden="true">✓</i>
                </div>
              ) : (
                <div className="profile-address-form">
                  <label>
                    <span>Full name</span>
                    <input
                      value={delivery.name}
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
                      rows={3}
                      value={delivery.address}
                      placeholder="Street, house number, and landmark"
                      onChange={(event) =>
                        setDelivery((value) => ({ ...value, address: event.target.value }))
                      }
                    />
                  </label>
                  <label>
                    <span>City</span>
                    <input
                      value={delivery.city}
                      onChange={(event) =>
                        setDelivery((value) => ({ ...value, city: event.target.value }))
                      }
                    />
                  </label>
                  <label>
                    <span>Delivery note</span>
                    <input
                      value={delivery.notes}
                      placeholder="Optional"
                      onChange={(event) =>
                        setDelivery((value) => ({ ...value, notes: event.target.value }))
                      }
                    />
                  </label>
                  {addressError && (
                    <p className="address-error full-width">{addressError}</p>
                  )}
                  <button
                    className="profile-save-address"
                    type="button"
                    onClick={saveDeliveryAddress}
                  >
                    Save delivery address
                  </button>
                </div>
              )}
            </section>

            <section className="profile-section" aria-labelledby="notifications-heading">
              <div className="profile-section-heading">
                <div>
                  <p>Preferences</p>
                  <h3 id="notifications-heading">Notifications</h3>
                </div>
              </div>
              <div className="notification-list">
                {[
                  ["orderUpdates", "Order updates", "Kitchen, rider, and delivery alerts"],
                  ["offers", "Offers & rewards", "Promos and Spin to Win reminders"],
                  ["reminders", "Meal reminders", "A gentle nudge around your usual time"],
                ].map(([key, title, note]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() =>
                      updateNotification(key as keyof typeof notifications)
                    }
                  >
                    <span>
                      <strong>{title}</strong>
                      <small>{note}</small>
                    </span>
                    <i
                      className={
                        notifications[key as keyof typeof notifications]
                          ? "is-on"
                          : ""
                      }
                      aria-label={
                        notifications[key as keyof typeof notifications] ? "On" : "Off"
                      }
                    />
                  </button>
                ))}
              </div>
            </section>
          </section>

          <nav className="bottom-nav" aria-label="Primary navigation">
            <button className="nav-item" type="button" onClick={() => setScreen("menu")}>
              <img src="/bowl-food.svg" alt="" aria-hidden="true" />
              <span>Menu</span>
            </button>
            <button className="nav-item" type="button" onClick={() => setScreen("orders")}>
              <img src="/shopping-cart.svg" alt="" aria-hidden="true" />
              <span>Orders</span>
              {activeOrders.length > 0 && (
                <b className="nav-order-count">{activeOrders.length}</b>
              )}
            </button>
            <button className="nav-item is-active" type="button" aria-current="page">
              <img
                className="profile-avatar"
                src={avatarSrc}
                alt=""
                aria-hidden="true"
              />
              <span>Profile</span>
            </button>
          </nav>
        </>
      ) : screen === "details" ? (
        <section className="details-content" aria-labelledby="meal-detail-heading">
          <h2 id="meal-detail-heading" className="sr-only">
            {meal.name} details
          </h2>

          <div className="detail-hero">
            <span className="detail-shadow" />
            <img
              ref={detailProductRef}
              className="detail-product"
              src={meal.image}
              alt={`${meal.name} noodle box`}
            />
          </div>

          <div className="meal-information">
            <div className="meal-description-row">
              <p className="meal-description">{meal.description}</p>
              <strong className="detail-price">{formatNaira(meal.price)}</strong>
            </div>
            <div className="meal-facts">
              <span>
                <img src="/clock.svg" alt="" aria-hidden="true" />
                {meal.minutes} min
              </span>
              <span>
                <img src="/lightning.svg" alt="" aria-hidden="true" />
                {meal.calories} kcal
              </span>
            </div>
          </div>

          <div className="order-controls">
            <div className="quantity-picker" aria-label="Quantity selector">
              <button
                type="button"
                aria-label="Increase quantity"
                onClick={() => setQuantity((value) => Math.min(20, value + 1))}
              >
                +
              </button>
              <output aria-live="polite">{String(quantity).padStart(2, "0")}</output>
              <button
                type="button"
                aria-label="Decrease quantity"
                disabled={quantity === 1}
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
              >
                −
              </button>
            </div>
            <button
              className="add-order"
              type="button"
              disabled={Boolean(flight)}
              onClick={addToOrder}
            >
              {flight ? "Adding..." : "Add to order"}
            </button>
          </div>

          <section className="spice-card" aria-labelledby="spice-heading">
            <div className="spice-card-heading">
              <h2 id="spice-heading">Spice Level</h2>
              <span aria-live="polite">
                {selectedSpice.name} · {Math.round(spice)}%
              </span>
            </div>

            <div className="spice-range-wrap">
              <input
                className="spice-range"
                type="range"
                min="0"
                max="100"
                step="0.1"
                value={spice}
                aria-label="Spice level"
                aria-valuetext={`${selectedSpice.name}, ${Math.round(spice)} percent`}
                onChange={(event) => setSpice(Number(event.target.value))}
              />
              <div className="range-names" aria-hidden="true">
                {spiceLevels.map((level) => (
                  <span key={level.name}>{level.name}</span>
                ))}
              </div>
            </div>

            <div className="spice-levels">
              {spiceLevels.map((level, index) => (
                <button
                  key={level.name}
                  className={spiceIndex === index ? "is-selected" : ""}
                  type="button"
                  style={{ "--level-color": level.color } as React.CSSProperties}
                  aria-pressed={spiceIndex === index}
                  onClick={() => setSpice(index * (100 / (spiceLevels.length - 1)))}
                >
                  <span className="flame-badge">
                    <i aria-hidden="true" />
                  </span>
                  <strong>{level.name}</strong>
                  <small>{level.note}</small>
                </button>
              ))}
            </div>
          </section>
        </section>
      ) : screen === "cart" ? (
        <section className="cart-content" aria-labelledby="cart-heading">
          <div className="cart-heading">
            <p>Order summary</p>
            <h2 id="cart-heading">
              {cartItems.length === 0
                ? "Your cart is waiting"
                : `${cartCount} ${cartCount === 1 ? "box" : "boxes"} selected`}
            </h2>
          </div>

          {activeOrders.length > 0 && (
            <div className="cart-order-switcher" aria-label="Orders in progress">
              {activeOrders.map((order) => {
                const status = getOrderStatus(order, orderClock);
                return (
                  <button
                    key={order.id}
                    className={selectedOrder?.id === order.id ? "is-selected" : ""}
                    type="button"
                    onClick={() => chooseTrackedOrder(order.id, "cart")}
                  >
                    <img src={meals[order.mealIndex].image} alt="" aria-hidden="true" />
                    <span>
                      <small>{order.id}</small>
                      <strong>{meals[order.mealIndex].name}</strong>
                      <em>{orderStages[status.stage].name}</em>
                    </span>
                    {selectedOrder?.id === order.id && (
                      <b>
                        {status.stage === 3
                          ? "View"
                          : formatCountdown(status.displaySeconds)}
                      </b>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {cartItems.length === 0 ? (
            <div className="empty-cart">
              <div className="empty-cart-icon">
                <img src="/shopping-cart.svg" alt="" aria-hidden="true" />
              </div>
              <h3>Nothing here yet</h3>
              <p>Swipe through the café menu and add a box when something catches your eye.</p>
              <button type="button" onClick={() => setScreen("menu")}>
                Explore the menu
              </button>
            </div>
          ) : (
            <>
              <div className="cart-list">
                {cartItems.map((item) => {
                  const cartMeal = meals[item.mealIndex];
                  const cartSpice = spiceLevels[item.spiceIndex];
                  return (
                    <article className="cart-item" key={item.id}>
                      <button
                        className="remove-item"
                        type="button"
                        aria-label={`Remove ${cartMeal.name}`}
                        onClick={() => removeCartItem(item.id)}
                      >
                        ×
                      </button>

                      <div className="cart-item-image">
                        <span />
                        <img src={cartMeal.image} alt={`${cartMeal.name} noodle box`} />
                      </div>

                      <div className="cart-item-copy">
                        <p>{cartMeal.eyebrow}</p>
                        <h3>{cartMeal.name}</h3>
                        <div className="cart-item-meta">
                          <span
                            className="spice-dot"
                            style={{ background: cartSpice.color }}
                            aria-hidden="true"
                          />
                          {cartSpice.name}
                          <i aria-hidden="true" />
                          {cartMeal.minutes} min
                        </div>
                      </div>

                      <div className="cart-item-footer">
                        <div className="cart-line-price">
                          <small>{formatNaira(cartMeal.price)} each</small>
                          <strong>{formatNaira(cartMeal.price * item.quantity)}</strong>
                        </div>
                        <div className="cart-quantity" aria-label={`${cartMeal.name} quantity`}>
                          <button
                            type="button"
                            aria-label={`Decrease ${cartMeal.name} quantity`}
                            disabled={item.quantity === 1}
                            onClick={() => changeCartQuantity(item.id, -1)}
                          >
                            −
                          </button>
                          <output>{String(item.quantity).padStart(2, "0")}</output>
                          <button
                            type="button"
                            aria-label={`Increase ${cartMeal.name} quantity`}
                            onClick={() => changeCartQuantity(item.id, 1)}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              <section className="checkout-card" aria-label="Order total">
                <div>
                  <span>Subtotal · {cartCount} {cartCount === 1 ? "box" : "boxes"}</span>
                  <strong>{formatNaira(subtotal)}</strong>
                </div>
                <div>
                  <span>Estimated kitchen time</span>
                  <strong>
                    {estimatedMinutes}–{estimatedMinutes + 5} min
                  </strong>
                </div>
                <button type="button" onClick={openCheckout}>
                  <span>Continue to checkout</span>
                  <span aria-hidden="true">→</span>
                </button>
              </section>
            </>
          )}
        </section>
      ) : screen === "checkout" ? (
        <section className="checkout-content" aria-labelledby="checkout-heading">
          <div className="checkout-progress" aria-label={`Checkout step ${checkoutStep} of 2`}>
            <div className="is-complete">
              <span>{checkoutStep > 1 ? "✓" : "1"}</span>
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
                <span>Confirm your boxes and unlock a café discount.</span>
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
                          {item.quantity} × {formatNaira(checkoutMeal.price)}
                        </span>
                      </div>
                      <strong>{formatNaira(checkoutMeal.price * item.quantity)}</strong>
                    </div>
                  );
                })}
              </div>

              <section className="promo-card" aria-labelledby="promo-heading">
                <div>
                  <span className="promo-spark" aria-hidden="true">✦</span>
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
                <b aria-hidden="true">→</b>
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
                  <strong>{discount > 0 ? `−${formatNaira(discount)}` : "—"}</strong>
                </div>
                <div className={wheelDiscount > 0 ? "discount-line" : ""}>
                  <span>Spin reward</span>
                  <strong>
                    {wheelDiscount > 0
                      ? `−${formatNaira(wheelDiscount)}`
                      : appliedWheelReward?.freeDelivery
                        ? "Free delivery"
                        : "—"}
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
                  <span aria-hidden="true">→</span>
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
                    <span aria-hidden="true">⌂</span>
                    <div>
                      <strong>{savedDelivery.name}</strong>
                      <p>{savedDelivery.address}</p>
                      <small>
                        {savedDelivery.city} · {savedDelivery.phone}
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
                    <span className="payment-icon wallet-icon" aria-hidden="true">₦</span>
                    <span>
                      <strong>Indomie Wallet</strong>
                      <small>Balance · ₦50,000</small>
                    </span>
                    <i aria-hidden="true" />
                  </button>
                  <button
                    className={paymentMethod === "transfer" ? "is-selected" : ""}
                    type="button"
                    onClick={() => setPaymentMethod("transfer")}
                  >
                    <span className="payment-icon" aria-hidden="true">↗</span>
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
                  <span>Place order · {formatNaira(orderTotal)}</span>
                  <span aria-hidden="true">→</span>
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
                        {item.quantity} × {formatNaira(orderedMeal.price)} ·{" "}
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
                <span>{index < trackingStage ? "✓" : index + 1}</span>
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
                <span aria-hidden="true">→</span>
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
              ×
            </button>

            <div className="wheel-modal-heading">
              <p>Indomie Café rewards</p>
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
                      ? "✓"
                      : wheelResult.extraSpin
                        ? "↻"
                        : "•"}
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
