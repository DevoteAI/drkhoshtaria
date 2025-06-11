import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { Globe, Menu, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export function Header() {
  const { language, setLanguage } = useLanguage();
  const { t } = useLanguage();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = React.useState(false);
  const location = useLocation();

  const languages = [
    { code: 'en', label: 'English' },
    { code: 'ka', label: 'ქართული' },
    { code: 'ru', label: 'Русский' },
  ] as const;

  const navItems = [
    { href: '/#about', label: () => t('nav.about') },
    { href: '/#services', label: () => t('nav.services') },
    { href: '/education', label: () => t('nav.education') },
    { href: '/ask', label: () => t('nav.askDoctor') },
    { href: '#contact', label: () => t('nav.contact') }
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] bg-dark-900/80 backdrop-blur-sm border-b border-dark-800/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link
              to="/" 
              className="font-mono text-xl font-semibold text-white hover:text-cyan-300 transition-colors tracking-brutalist uppercase"
            >
              Dr. Khoshtaria
            </Link>
            <nav className="hidden md:flex ml-10 space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className="font-mono text-dark-100 hover:text-cyan-300 transition-colors text-sm font-medium uppercase tracking-brutalist"
                >
                  {item.label()}
                </Link>
              ))}
            </nav>
          </div>
          
          <div className="flex items-center space-x-6">
            <div className="relative">
              <button
                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg text-dark-100 hover:text-cyan-300 transition-colors border border-dark-700/30 hover:border-cyan-400/30"
              >
                <Globe className="w-5 h-5" />
                <span className="capitalize">{language}</span>
              </button>
              
              <div
                className={`fixed right-4 mt-2 w-48 rounded-xl shadow-lg bg-dark-800/95 backdrop-blur-sm border border-dark-700/30 transform transition-all duration-200 z-[110] ${
                  isLangMenuOpen
                    ? 'opacity-100 visible translate-y-0'
                    : 'opacity-0 invisible -translate-y-2'
                }`}
              >
                <div className="py-1" role="menu">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setLanguage(lang.code);
                        setIsLangMenuOpen(false);
                      }}
                      className={`block w-full text-left px-4 py-2 text-sm ${
                        language === lang.code
                          ? 'bg-cyan-900/50 text-cyan-300'
                          : 'text-dark-100 hover:bg-dark-700/50'
                      }`}
                      role="menuitem"
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>
              {isLangMenuOpen && (
                <div
                  className="fixed inset-0 z-[105]"
                  onClick={() => setIsLangMenuOpen(false)}
                />
              )}
            </div>
            
            <button
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? (
                <X className="w-6 h-6 text-brand-300" />
              ) : (
                <Menu className="w-6 h-6 text-dark-100" />
              )}
            </button>
            <Link
              to="/admin/login"
              className="ml-4 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-400 text-white hover:from-cyan-400 hover:to-cyan-300 transition-all duration-300 shadow-lg hover:shadow-cyan-500/20 relative group overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/0 via-cyan-400/50 to-cyan-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"></div>
              Admin Portal
              <div className="absolute inset-0 bg-gradient-radial from-cyan-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            </Link>
          </div>
        </div>
        
        {/* Mobile menu */}
        <div
          className={`md:hidden transition-all duration-300 ease-in-out ${
            isMenuOpen ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'
          } overflow-hidden`}
        >
          <div className="py-2 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setIsMenuOpen(false)}
                className="block px-3 py-2 text-base font-medium text-dark-100 hover:text-brand-300 transition-colors"
              >
                {item.label()}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}