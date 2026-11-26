import { useState } from "react";
import Button from "../components/ui/Button";
import { Award, Trophy, Gift } from "lucide-react";

interface RewardCoupon {
  id: string;
  partner: string;
  offer: string;
  pointsCost: number;
  description: string;
  code: string;
}

interface Badge {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  icon: any;
}

export default function Rewards() {
  const [points, setPoints] = useState(150); // Mock Karma Points balance
  const [claimedCodes, setClaimedCodes] = useState<Record<string, string>>({});

  const badges: Badge[] = [
    {
      id: "1",
      title: "First Responder",
      description: "Successfully completed your first stray rescue assignment.",
      unlocked: true,
      icon: Trophy,
    },
    {
      id: "2",
      title: "Street Guardian",
      description: "Successfully completed 5 stray rescue assignments.",
      unlocked: true,
      icon: Award,
    },
    {
      id: "3",
      title: "Life Saver Extraordinaire",
      description: "Successfully completed 10 stray rescue assignments.",
      unlocked: false,
      icon: Trophy,
    },
  ];

  const coupons: RewardCoupon[] = [
    {
      id: "1",
      partner: "Heads Up For Tails",
      offer: "15% OFF Pet Grooming",
      pointsCost: 50,
      description: "Get 15% off any grooming service at Heads Up For Tails stores.",
      code: "HUFT15KARMA",
    },
    {
      id: "2",
      partner: "VetCare Noida",
      offer: "Free General Health Consultation",
      pointsCost: 100,
      description: "One free diagnostic wellness consultation for any street or adopted pet.",
      code: "VETNOIDAFREE",
    },
    {
      id: "3",
      partner: "Doggy Dhaba",
      offer: "Buy 1 Get 1 Free Meals",
      pointsCost: 30,
      description: "BOGO offer on healthy prepared food boxes for stray animal feedings.",
      code: "DOGGYKARMA2",
    },
  ];

  function handleClaim(coupon: RewardCoupon) {
    if (points < coupon.pointsCost) {
      alert("Not enough Karma Points!");
      return;
    }
    setPoints(prev => prev - coupon.pointsCost);
    setClaimedCodes(prev => ({
      ...prev,
      [coupon.id]: coupon.code,
    }));
  }

  return (
    <div className="min-h-screen bg-[#F4F6F8] p-5 pb-32">
      <div className="max-w-md mx-auto mb-6 text-center">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-800 text-xs font-black uppercase tracking-wider mb-2">
          <Gift size={13} className="text-emerald-600" /> StrayAid Karma
        </span>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          Rewards & Impact
        </h1>
      </div>

      {/* Points Summary Glass Card */}
      <div className="relative overflow-hidden max-w-md mx-auto mb-6 rounded-3xl p-6 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white border border-white/25 shadow-xl shadow-emerald-900/15 text-center">
        <div className="pointer-events-none absolute -top-10 -right-10 h-36 w-36 rounded-full bg-white/10 blur-xl" />
        <p className="text-xs uppercase tracking-widest text-emerald-100 font-extrabold">Your Karma Balance</p>
        <h2 className="text-5xl font-black mt-2 text-white drop-shadow-xs">{points}</h2>
        <p className="text-xs font-semibold text-emerald-100 mt-1">Karma Points Available</p>
        <p className="text-[11px] text-emerald-100/80 mt-3 bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/15">
          ✨ Earn more points by submitting reports and completing rescues!
        </p>
      </div>

      {/* Badges Feed */}
      <div className="max-w-md mx-auto mb-8">
        <h2 className="text-lg font-black text-slate-900 mb-3.5 flex items-center gap-2 tracking-tight">
          🏆 Achievement Badges
        </h2>
        <div className="space-y-3">
          {badges.map(badge => {
            const IconComp = badge.icon;
            return (
              <div
                key={badge.id}
                className={`flex gap-3.5 items-center p-4 rounded-3xl glass-card transition-all duration-200 ${
                  badge.unlocked ? "border-emerald-500/20" : "opacity-60"
                }`}
              >
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-xs ${
                  badge.unlocked ? "glass-button-primary" : "bg-slate-100 text-slate-400"
                }`}>
                  <IconComp size={20} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-extrabold text-slate-900">{badge.title}</h3>
                    {badge.unlocked && (
                      <span className="text-[10px] font-black bg-emerald-500/15 text-emerald-700 px-2.5 py-0.5 rounded-full uppercase border border-emerald-500/25">
                        Unlocked
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">{badge.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Partner Coupons */}
      <div className="max-w-md mx-auto">
        <h2 className="text-lg font-black text-slate-900 mb-3.5 flex items-center gap-2 tracking-tight">
          🎁 Claim Partner Coupons
        </h2>
        <div className="space-y-4">
          {coupons.map(coupon => {
            const code = claimedCodes[coupon.id];
            return (
              <div key={coupon.id} className="p-5 rounded-3xl glass-card border border-white/80 shadow-md">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{coupon.partner}</span>
                    <h3 className="text-base font-extrabold text-slate-900 leading-tight mt-0.5">{coupon.offer}</h3>
                  </div>
                  <span className="bg-emerald-500/15 text-emerald-800 text-xs font-black px-3 py-1 rounded-full border border-emerald-500/25">
                    {coupon.pointsCost} pts
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mb-4">{coupon.description}</p>

                {code ? (
                  <div className="bg-emerald-500/10 border border-dashed border-emerald-500/30 rounded-2xl p-3 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600">Coupon Code:</span>
                    <span className="text-sm font-black text-emerald-800 font-mono tracking-wider">{code}</span>
                  </div>
                ) : (
                  <Button
                    onClick={() => handleClaim(coupon)}
                    disabled={points < coupon.pointsCost}
                    variant={points >= coupon.pointsCost ? "primary" : "outline"}
                    size="md"
                    className="w-full text-xs font-black shadow-md shadow-emerald-700/20"
                  >
                    Claim Reward
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
