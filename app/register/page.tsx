'use client'

import { useActionState } from 'react'
import { signup } from '@/app/auth/actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export default function RegisterPage() {
    const [state, formAction, isPending] = useActionState(signup, null)

    return (
        <div className="bg-background-dark font-display text-white min-h-screen flex flex-col">
            <div className="layout-container flex h-full grow flex-col">
                {/* Header */}
                <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-b-[#233648] px-10 py-3 bg-background-dark">
                    <div className="flex items-center gap-4 text-white">
                        <div className="size-6 text-primary">
                            <span className="material-symbols-outlined text-3xl">schedule</span>
                        </div>
                        <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em]">
                            Chấm Công FHB Vietnam
                        </h2>
                    </div>
                    <div className="hidden md:flex flex-1 justify-end gap-8">
                        <div className="flex items-center gap-9">
                            <a className="text-white text-sm font-medium leading-normal hover:text-primary transition-colors" href="#">Features</a>
                            <a className="text-white text-sm font-medium leading-normal hover:text-primary transition-colors" href="#">Pricing</a>
                            <a className="text-white text-sm font-medium leading-normal hover:text-primary transition-colors" href="#">Help</a>
                        </div>
                        <a href="/login">
                            <button className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em]">
                                <span className="truncate">Log In</span>
                            </button>
                        </a>
                    </div>
                </header>

                <main className="flex-1 flex items-center justify-center py-12 px-6">
                    <div className="max-w-[1100px] w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        {/* Left Hero */}
                        <div className="hidden lg:flex flex-col gap-8">
                            <div
                                className="w-full aspect-square bg-gradient-to-br from-primary/20 to-transparent rounded-xl flex items-center justify-center p-8 relative overflow-hidden border border-white/5"
                            >
                                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_70%)] from-primary"></div>
                                <div className="relative z-10 text-center">
                                    <span className="material-symbols-outlined text-[180px] text-primary/80 mb-6 block">timer</span>
                                    <h1 className="text-white text-4xl font-black leading-tight tracking-[-0.033em]">
                                        The future of <br />
                                        timekeeping.
                                    </h1>
                                    <p className="text-[#92adc9] text-lg mt-4 max-w-sm mx-auto">
                                        Manage your team's productivity with our intuitive workspace.
                                    </p>
                                </div>
                                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl"></div>
                                <div className="absolute -top-10 -left-10 w-40 h-40 bg-primary/20 rounded-full blur-3xl"></div>
                            </div>
                        </div>

                        {/* Right Form */}
                        <div className="bg-[#1a2632] p-8 lg:p-12 rounded-xl border border-[#233648] shadow-2xl">
                            <div className="flex flex-col gap-3 mb-8">
                                <p className="text-white text-3xl font-black leading-tight tracking-[-0.033em]">
                                    Get started today
                                </p>
                                <p className="text-[#92adc9] text-base font-normal leading-normal">
                                    Enter your details to create your secure workspace.
                                </p>
                            </div>

                            <form action={formAction} className="flex flex-col gap-4">
                                {state?.error && (
                                    <div className="p-3 text-sm text-red-500 bg-red-900/20 border border-red-500/20 rounded-lg">
                                        {state.error}
                                    </div>
                                )}
                                <div className="flex flex-wrap gap-4">
                                    <Label className="flex flex-col min-w-[200px] flex-1">
                                        <p className="text-white text-sm font-medium leading-normal pb-2">First Name</p>
                                        <Input
                                            name="firstName"
                                            type="text"
                                            placeholder="John"
                                            required
                                            className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-white focus:outline-0 focus:ring-2 focus:ring-primary border-none bg-[#233648] h-12 placeholder:text-[#92adc9]/50 px-4 text-base font-normal leading-normal"
                                        />
                                    </Label>
                                    <Label className="flex flex-col min-w-[200px] flex-1">
                                        <p className="text-white text-sm font-medium leading-normal pb-2">Last Name</p>
                                        <Input
                                            name="lastName"
                                            type="text"
                                            placeholder="Doe"
                                            required
                                            className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-white focus:outline-0 focus:ring-2 focus:ring-primary border-none bg-[#233648] h-12 placeholder:text-[#92adc9]/50 px-4 text-base font-normal leading-normal"
                                        />
                                    </Label>
                                </div>

                                <div className="flex flex-wrap gap-4">
                                    <Label className="flex flex-col min-w-[200px] flex-[2]">
                                        <p className="text-white text-sm font-medium leading-normal pb-2">Email Address</p>
                                        <Input
                                            name="email"
                                            type="email"
                                            placeholder="name@company.com"
                                            required
                                            className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-white focus:outline-0 focus:ring-2 focus:ring-primary border-none bg-[#233648] h-12 placeholder:text-[#92adc9]/50 px-4 text-base font-normal leading-normal"
                                        />
                                    </Label>
                                    <Label className="flex flex-col min-w-[200px] flex-1">
                                        <p className="text-white text-sm font-medium leading-normal pb-2">Department</p>
                                        <select
                                            name="department"
                                            className="flex w-full min-w-0 flex-1 rounded-lg text-white focus:outline-0 focus:ring-2 focus:ring-primary border-none bg-[#233648] h-12 px-4 text-base font-normal leading-normal appearance-none"
                                        >
                                            <option disabled selected value="">Select...</option>
                                            <option value="Engineering">Engineering</option>
                                            <option value="Design">Design</option>
                                            <option value="Marketing">Marketing</option>
                                            <option value="Sales">Sales</option>
                                            <option value="Operations">Operations</option>
                                        </select>
                                    </Label>
                                </div>

                                <div className="flex flex-wrap gap-4">
                                    <Label className="flex flex-col min-w-[200px] flex-1">
                                        <p className="text-white text-sm font-medium leading-normal pb-2">Password</p>
                                        <Input
                                            name="password"
                                            type="password"
                                            placeholder="••••••••"
                                            required
                                            className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-white focus:outline-0 focus:ring-2 focus:ring-primary border-none bg-[#233648] h-12 placeholder:text-[#92adc9]/50 px-4 text-base font-normal leading-normal"
                                        />
                                    </Label>
                                    <Label className="flex flex-col min-w-[200px] flex-1">
                                        <p className="text-white text-sm font-medium leading-normal pb-2">Confirm Password</p>
                                        <Input
                                            name="confirmPassword"
                                            type="password"
                                            placeholder="••••••••"
                                            required
                                            className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-white focus:outline-0 focus:ring-2 focus:ring-primary border-none bg-[#233648] h-12 placeholder:text-[#92adc9]/50 px-4 text-base font-normal leading-normal"
                                        />
                                    </Label>
                                </div>

                                <Button
                                    type="submit"
                                    disabled={isPending}
                                    className="mt-4 flex min-w-[84px] w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-5 bg-primary text-white text-base font-bold leading-normal tracking-[0.015em] hover:bg-primary/90 transition-colors"
                                >
                                    <span className="truncate">
                                        {isPending ? 'Creating Account...' : 'Create Account'}
                                    </span>
                                </Button>

                                <div className="relative flex items-center py-4">
                                    <div className="flex-grow border-t border-[#233648]"></div>
                                    <span className="flex-shrink mx-4 text-[#92adc9] text-xs uppercase tracking-widest">
                                        Or continue with
                                    </span>
                                    <div className="flex-grow border-t border-[#233648]"></div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        className="flex items-center justify-center gap-3 bg-[#233648] hover:bg-[#2d4358] text-white py-3 rounded-lg border border-transparent transition-colors"
                                        type="button"
                                    >
                                        <span className="text-sm font-medium">Google</span>
                                    </button>
                                    <button
                                        className="flex items-center justify-center gap-3 bg-[#233648] hover:bg-[#2d4358] text-white py-3 rounded-lg border border-transparent transition-colors"
                                        type="button"
                                    >
                                        <span className="text-sm font-medium">Microsoft</span>
                                    </button>
                                </div>
                            </form>

                            <p className="text-center mt-8 text-[#92adc9] text-sm">
                                Already have an account?{' '}
                                <a className="text-primary font-bold hover:underline" href="/login">
                                    Log in
                                </a>
                            </p>
                        </div>
                    </div>
                </main>

                <footer className="border-t border-[#233648] px-10 py-6 text-center">
                    <p className="text-[#92adc9] text-xs">
                        © 2024 Chấm Công FHB Vietnam Inc. All rights reserved. By signing up, you agree
                        to our Terms of Service and Privacy Policy.
                    </p>
                </footer>
            </div>
        </div>
    )
}
