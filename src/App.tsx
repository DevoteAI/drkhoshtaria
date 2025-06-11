import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Calendar, Phone, Mail, Clock, MapPin, Award, Heart, Users, Activity, Building2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { LampContainer } from './components/ui/lamp';
import { Header } from './components/Header';
import { useEffect } from 'react';
import { AskDoctor } from './pages/AskDoctor';
import { Admin } from './pages/Admin';
import { AdminLogin } from './pages/AdminLogin';
import { ChatHistory } from './pages/ChatHistory';
import { Education } from './pages/Education';
import { useLanguage } from './contexts/LanguageContext';
import { useLocation } from 'react-router-dom';

function Stat({ icon: Icon, number, text }: { icon: React.ElementType; number: string; text: string }) {
  return (
    <div className="flex flex-col items-center p-6 bg-dark-800/50 backdrop-blur-sm rounded-xl shadow-lg transform hover:scale-105 transition-all duration-300 border border-dark-700/30 animate-fade-in">
      <Icon className="w-8 h-8 text-cyan-400 mb-3" />
      <h3 className="font-mono text-3xl font-bold text-white mb-2 tracking-tight">{number}</h3>
      <p className="font-mono text-dark-100 text-center uppercase tracking-brutalist text-sm">{text}</p>
    </div>
  );
}

function ContactInfo({ icon: Icon, text, link }: { icon: React.ElementType; text: string; link?: string }) {
  const content = (
    <>
      <Icon className="w-5 h-5 text-cyan-400 mr-2 group-hover:text-cyan-300 transition-colors" />
      <span className="text-dark-100">{text}</span>
    </>
  );

  return (
    <div className="flex items-center mb-4">
      {link ? (
        <a href={link} className="flex items-center hover:text-cyan-300 transition-colors group">
          {content}
        </a>
      ) : (
        <div className="group">
          {content}
        </div>
      )}
    </div>
  );
}

function Home() {
  const { t } = useLanguage();
  const location = useLocation();

  useEffect(() => {
    // Check if there's a hash in the URL
    if (location.hash) {
      const element = document.querySelector(location.hash);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [location.hash]);

  return (
    <>
      {/* Hero Section */}
      <LampContainer>
        <div className="flex flex-col-reverse md:grid md:grid-cols-2 gap-8 md:gap-12 items-center w-full">
          <div className="space-y-6 pt-8 md:pt-12 text-center md:text-left">
            <motion.h1
              initial={{ opacity: 0.5, y: 100 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.3,
                duration: 0.8,
                ease: "easeInOut",
              }}
              className="font-display text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.1] tracking-brutalist uppercase"
            >
              {t('hero.title')}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.5,
                duration: 0.8,
                ease: "easeInOut",
              }}
              className="font-mono text-xl md:text-2xl text-brand-100/90 leading-relaxed max-w-xl tracking-tight"
            >
              {t('hero.subtitle')}
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.7,
                duration: 0.8,
                ease: "easeInOut",
              }}
            >
              <a
                href="#contact"
                className="font-mono inline-flex items-center px-10 py-5 text-lg font-semibold text-white bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 transition-all duration-300 shadow-lg hover:shadow-cyan-500/50 relative overflow-hidden group uppercase tracking-ultra"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/0 via-cyan-400/50 to-cyan-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"></div>
                {t('hero.cta')}
                <div className="absolute inset-0 bg-gradient-radial from-cyan-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              </a>
            </motion.div>
          </div>
          <motion.div
              initial={{ opacity: 0, x: 100 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{
                delay: 0.5,
                duration: 0.8,
                ease: "easeInOut",
              }}
              className="relative flex justify-center md:justify-end h-[500px] md:h-[600px] w-full overflow-visible"
            >
              <img
                src="https://i.imgur.com/KZ61nmg.png"
                alt={t('hero.title')}
                className="h-full w-auto max-w-none object-contain object-right scale-125 md:translate-x-12 -translate-y-16 md:-translate-y-24"
              />
            </motion.div>
        </div>
      </LampContainer>

      {/* Stats Section */}
      <div id="about" className="relative -mt-12">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-dark-800/50 to-dark-800"></div>
        <div className="absolute inset-0 bg-dark-800/80 translate-y-16"></div>
        <div className="relative py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <Stat
                icon={Users}
                number={t('stats.childbirths.number')}
                text={t('stats.childbirths.text')}
              />
              <Stat
                icon={Activity}
                number={t('stats.complications.number')}
                text={t('stats.complications.text')}
              />
              <Stat
                icon={Award}
                number={t('stats.surgeries.number')}
                text={t('stats.surgeries.text')}
              />
              <Stat
                icon={Heart}
                number={t('stats.experience.number')}
                text={t('stats.experience.text')}
              />
            </div>
          </div>
        </div>
      </div>

      {/* About Section */}
      <div id="services" className="py-20 bg-dark-900 relative">
        <div className="absolute inset-0 bg-gradient-radial from-brand-400/5 via-transparent to-transparent"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4 animate-fade-in">{t('expertise.title')}</h2>
            <p className="text-lg text-dark-100 animate-slide-up">{t('expertise.subtitle')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: t('expertise.services.obstetrics.title'),
                description: t('expertise.services.obstetrics.description'),
              },
              {
                title: t('expertise.services.surgery.title'),
                description: t('expertise.services.surgery.description'),
              },
              {
                title: t('expertise.services.health.title'),
                description: t('expertise.services.health.description'),
              },
              {
                title: t('expertise.services.additional.title'),
                description: t('expertise.services.additional.description'),
              },
            ].map((service, index) => (
              <div
                key={index}
                className="bg-dark-800/50 backdrop-blur-sm rounded-xl p-8 hover:shadow-xl transition-all duration-300 border border-dark-700/30 animate-fade-in hover:border-brand-400/30 group"
              >
                <h3 className="text-xl font-semibold text-white mb-4 group-hover:text-cyan-300 transition-colors">{service.title}</h3>
                <p className="text-dark-100 group-hover:text-dark-50 transition-colors">{service.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Contact Section */}
      <div id="contact" className="py-24 bg-dark-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-radial from-brand-400/5 via-transparent to-transparent"></div>
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1504672281656-e4981d70414b?q=80&w=2070')] bg-cover bg-center opacity-5"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-20">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight"
            >
              {t('contact.title')}
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xl text-dark-100"
            >
              {t('contact.subtitle')}
            </motion.p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Contact Information Card */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="bg-dark-800/50 backdrop-blur-sm rounded-2xl shadow-lg border border-dark-700/30 p-8 hover:shadow-cyan-500/5 transition-all duration-500"
            >
              <h3 className="text-2xl font-semibold text-white mb-8">{t('contact.getInTouch')}</h3>
              <div className="space-y-6">
                <div className="flex items-center space-x-4 p-4 rounded-xl bg-dark-700/30">
                  <div className="p-3 rounded-lg bg-cyan-500/10 group-hover:bg-cyan-500/20 transition-colors">
                    <Phone className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-dark-200 text-sm">{t('contact.mobile')}</p>
                    <p className="text-white font-medium">{t('contact.phone')}</p>
                  </div>
                </div>

                <a 
                  href={`mailto:${t('contact.email')}`}
                  className="flex items-center space-x-4 p-4 rounded-xl bg-dark-700/30 hover:bg-dark-700/50 transition-colors group"
                >
                  <div className="p-3 rounded-lg bg-cyan-500/10 group-hover:bg-cyan-500/20 transition-colors">
                    <Mail className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-dark-200 text-sm">Email</p>
                    <p className="text-white font-medium">{t('contact.email')}</p>
                  </div>
                </a>

                <div className="flex items-center space-x-4 p-4 rounded-xl bg-dark-700/30">
                  <div className="p-3 rounded-lg bg-cyan-500/10">
                    <Clock className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-dark-200 text-sm">{t('contact.hours')}</p>
                    <p className="text-white font-medium">{t('contact.appointments')}</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Current Workplaces Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="bg-dark-800/50 backdrop-blur-sm rounded-2xl shadow-lg border border-dark-700/30 p-8 hover:shadow-cyan-500/5 transition-all duration-500"
            >
              <h3 className="text-2xl font-semibold text-white mb-8">{t('contact.currentWorkplaces')}</h3>
              <div className="space-y-6">
                <div className="p-6 rounded-xl bg-dark-700/30 border border-dark-600/30">
                  <div className="flex items-start space-x-4">
                    <div className="p-3 rounded-lg bg-cyan-500/10">
                      <Building2 className="w-6 h-6 text-cyan-400" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-2">
                        {t('contact.clinics.openHeart')}
                      </h4>
                      <div className="flex items-center text-dark-200">
                        <MapPin className="w-4 h-4 mr-2" />
                        <span>Tbilisi, Georgia</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-xl bg-dark-700/30 border border-dark-600/30">
                  <div className="flex items-start space-x-4">
                    <div className="p-3 rounded-lg bg-cyan-500/10">
                      <Building2 className="w-6 h-6 text-cyan-400" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-2">
                        {t('contact.clinics.barbara')}
                      </h4>
                      <div className="flex items-center text-dark-200">
                        <MapPin className="w-4 h-4 mr-2" />
                        <span>Tbilisi, Georgia</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-dark-900 border-t border-dark-800 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-dark-200">{t('footer.copyright')}</p>
        </div>
      </footer>
    </>
  );
}

function App() {
  return (
    <div className="min-h-screen bg-dark-900 text-white pt-16">
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="/ask" element={<AskDoctor />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/chat-history" element={<ChatHistory />} />
        <Route path="/education" element={<Education />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;