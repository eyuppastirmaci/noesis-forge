import { useEffect, useState } from "react";

// Modal stack manager with singleton pattern
class ModalStackManager {
  private static instance: ModalStackManager;
  private modalStack: string[] = [];
  private baseZIndex = 1000;
  private listeners: Map<string, (zIndex: number) => void> = new Map();

  private constructor() {}

  static getInstance(): ModalStackManager {
    if (!ModalStackManager.instance) {
      ModalStackManager.instance = new ModalStackManager();
    }
    return ModalStackManager.instance;
  }

  addModal(modalId: string): number {
    if (!this.modalStack.includes(modalId)) {
      this.modalStack.push(modalId);
    }
    const index = this.modalStack.indexOf(modalId);
    const zIndex = this.baseZIndex + (index * 10);
    
    // Notify listener
    const listener = this.listeners.get(modalId);
    if (listener) {
      listener(zIndex);
    }
    
    return zIndex;
  }

  removeModal(modalId: string): void {
    this.modalStack = this.modalStack.filter(id => id !== modalId);
  }

  subscribe(modalId: string, callback: (zIndex: number) => void): void {
    this.listeners.set(modalId, callback);
  }

  unsubscribe(modalId: string): void {
    this.listeners.delete(modalId);
  }

  getZIndex(modalId: string, customZIndex?: number): number {
    if (customZIndex) return customZIndex;
    
    const index = this.modalStack.indexOf(modalId);
    return index === -1 ? this.baseZIndex : this.baseZIndex + (index * 10);
  }
}

export interface UseModalStackOptions {
  modalId: string;
  isOpen: boolean;
  zIndex?: number;
}

export const useModalStack = ({ 
  modalId, 
  isOpen, 
  zIndex: customZIndex 
}: UseModalStackOptions): number => {
  const manager = ModalStackManager.getInstance();
  const [zIndex, setZIndex] = useState(customZIndex || manager.getZIndex(modalId));

  useEffect(() => {
    // Subscribe to z-index updates
    manager.subscribe(modalId, setZIndex);

    if (isOpen) {
      const newZIndex = customZIndex || manager.addModal(modalId);
      setZIndex(newZIndex);
    } else {
      manager.removeModal(modalId);
    }

    return () => {
      manager.removeModal(modalId);
      manager.unsubscribe(modalId);
    };
  }, [isOpen, modalId, customZIndex, manager]);

  return zIndex;
};