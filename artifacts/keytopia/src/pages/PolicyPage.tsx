import { Link } from 'wouter';
import { useLang } from '../contexts/LanguageContext';
import Layout from '../components/Layout';
import { ShieldCheck, RotateCcw, HelpCircle, MessageCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PolicyPage() {
  const { t, dir } = useLang();
  const BackArrow = dir === 'rtl' ? ArrowRight : ArrowLeft;

  const sections = [
    {
      icon: RotateCcw,
      title: t('refundPolicyTitle'),
      content: t('refundPolicyContent'),
      color: 'text-primary bg-primary/10',
    },
    {
      icon: ShieldCheck,
      title: t('warrantyTitle'),
      content: t('warrantyContent'),
      color: 'text-[#1CC88A] bg-[#1CC88A]/10',
    },
    {
      icon: HelpCircle,
      title: t('howToClaimTitle'),
      content: t('howToClaimContent'),
      color: 'text-secondary bg-secondary/10',
    },
  ];

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-6 py-10 w-full">
        {/* Back */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 group"
        >
          <BackArrow className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          {t('backToStore')}
        </Link>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10"
        >
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">
            {t('policyTitle')}
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            {t('policySubtitle')}
          </p>
        </motion.div>

        {/* Sections */}
        <div className="flex flex-col gap-6">
          {sections.map(({ icon: Icon, title, content, color }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.08 * (i + 1) }}
              className="bg-card rounded-[24px] border border-black/[0.06] p-8 shadow-sm"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-display font-bold">{title}</h2>
              </div>
              <div className="text-muted-foreground leading-relaxed whitespace-pre-line text-[15px]">
                {content}
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.36 }}
          className="mt-8 bg-gradient-to-br from-secondary to-primary rounded-[24px] p-8 text-center text-white"
        >
          <MessageCircle className="w-10 h-10 mx-auto mb-4 opacity-80" />
          <p className="font-display font-bold text-xl mb-2">{t('howToClaimTitle')}</p>
          <p className="text-white/80 text-sm mb-6">{t('howToClaimContent')}</p>
          <a
            href="https://wa.me/201229327902"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white text-secondary font-bold px-8 py-3.5 rounded-full transition-all hover:bg-white/90 active:scale-[0.98] shadow-sm"
          >
            <MessageCircle className="w-4 h-4" />
            {t('contactViaWhatsApp')}
          </a>
        </motion.div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          {t('lastUpdated')}: {new Date().toLocaleDateString(dir === 'rtl' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>
    </Layout>
  );
}
