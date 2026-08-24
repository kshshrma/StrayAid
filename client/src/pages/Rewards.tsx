import { useState } from "react";
import Card from "../components/ui/Card";
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
    <div className="min-h-screen bg-slate-100 p-5 pb-28">
      <h1 className="mb-6 text-center text-4xl font-extrabold text-slate-900 tracking-tight flex items-center justify-center gap-2">
        <Gift className="text-green-600 animate-bounce" size={32} /> Rewards
      </h1>

      {/* Points Summary */}
      <Card className="max-w-md mx-auto mb-6 bg-gradient-to-br from-green-700 to-emerald-500 text-white border-none p-6 text-center">
        <p className="text-xs uppercase tracking-widest opacity-90">Your Karma Balance</p>
        <h2 className="text-5xl font-black mt-2">{points}</h2>
        <p className="text-sm opacity-90 mt-1">Karma Points</p>
        <p className="text-xs opacity-75 mt-3">Earn more points by submitting reports and completing rescues!</p>
      </Card>

      {/* Badges Feed */}
      <div className="max-w-md mx-auto mb-8">
        <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
          🏆 Achievement Badges
        </h2>
        <div className="space-y-3">
          {badges.map(badge => {
            const IconComp = badge.icon;
            return (
              <div
                key={badge.id}
                className={`flex gap-4 items-center p-4 rounded-xl border bg-white shadow-sm transition-all ${
                  badge.unlocked ? "border-green-100" : "border-slate-100 opacity-60"
                }`}
              >
                <div className={`p-2.5 rounded-lg ${badge.unlocked ? "bg-green-50 text-green-700" : "bg-slate-50 text-slate-400"}`}>
                  <IconComp size={20} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">{badge.title}</h3>
                    {badge.unlocked && (
                      <span className="text-[10px] font-bold bg-green-50 text-green-600 px-2 py-0.5 rounded-full uppercase">
                        Unlocked
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{badge.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Partner Coupons */}
      <div className="max-w-md mx-auto">
        <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
          🎁 Claim Partner Coupons
        </h2>
        <div className="space-y-4">
          {coupons.map(coupon => {
            const code = claimedCodes[coupon.id];
            return (
              <Card key={coupon.id} className="p-5 rounded-2xl border border-slate-100 bg-white">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-xs font-semibold text-gray-400 uppercase">{coupon.partner}</span>
                    <h3 className="text-base font-bold text-slate-900">{coupon.offer}</h3>
                  </div>
                  <span className="bg-green-50 text-green-700 text-xs font-extrabold px-2.5 py-1 rounded-lg">
                    {coupon.pointsCost} pts
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-4">{coupon.description}</p>

                {code ? (
                  <div className="bg-green-50/50 border border-dashed border-green-200 rounded-xl p-3 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Coupon Claimed! Code:</span>
                    <span className="text-sm font-extrabold text-green-700 font-mono tracking-wider">{code}</span>
                  </div>
                ) : (
                  <Button
                    onClick={() => handleClaim(coupon)}
                    disabled={points < coupon.pointsCost}
                    className={`w-full py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 ${
                      points >= coupon.pointsCost
                        ? "bg-green-600 hover:bg-green-700 text-white"
                        : "bg-slate-100 text-slate-400 cursor-not-allowed"
                    }`}
                  >
                    Claim Reward
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
