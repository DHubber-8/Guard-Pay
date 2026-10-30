import { Wallet, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { usePaypalConnected, setPaypalConnected } from "../session";

/** Blue notice shown while the merchant's PayPal account is disconnected. */
export default function PaypalBanner({ inSettings = false }) {
  const connected = usePaypalConnected();
  if (connected) return null;
  return (
    <div className="pp-banner" role="status">
      <span className="pp-dot" aria-hidden="true"><Wallet size={18} /></span>
      <div className="grow stack gap-4">
        <b>Please connect your PayPal account</b>
        <span className="small">We need it to see your payments, disputes and tracking. Until then your inbox, shipments and refunds stay empty.</span>
      </div>
      {inSettings
        ? <button className="btn on-dark sm" onClick={() => setPaypalConnected(true)}>Connect PayPal</button>
        : <Link className="btn on-dark sm" to="/merchant/settings?tab=paypal">Connect PayPal <ArrowRight size={16} /></Link>}
    </div>
  );
}
