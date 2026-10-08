import { Injectable } from '@nestjs/common';
import {
  Experience,
  ExperienceCategory,
  ExperienceAvailability,
} from './entities/experience.entity';
import { createId } from '../common/utils/id';

@Injectable()
export class ExperiencesRepository {
        private experiences: Experience[] = [
    {
      id: 'default-exp-1',
      partnerId: 'experience-partner-1',
      title: 'Dudhsagar Waterfalls Trek',
      description: 'A thrilling trek through the lush forests to the majestic Dudhsagar waterfalls.',
      destination: 'Goa',
      category: ExperienceCategory.ADVENTURE,
      availability: ExperienceAvailability.AVAILABLE,
      price: 91,
      durationHours: 6,
      capacity: 6,
      booked: 0,
      image: 'https://picsum.photos/seed/dudhsagar/800/600',
      nextSlot: '2026-09-01T10:00:00Z',
      slots: [],
    },
    {
      id: 'default-exp-2',
      partnerId: 'experience-partner-1',
      title: 'Old Goa Heritage Walk',
      description: 'Explore the stunning churches and Portuguese architecture of Old Goa.',
      destination: 'Goa',
      category: ExperienceCategory.CULTURAL,
      availability: ExperienceAvailability.AVAILABLE,
      price: 114,
      durationHours: 4,
      capacity: 18,
      booked: 0,
      image: 'https://picsum.photos/seed/oldgoa/800/600',
      nextSlot: '2026-09-01T10:00:00Z',
      slots: [],
    },
    {
      id: 'default-exp-3',
      partnerId: 'experience-partner-1',
      title: 'Mandovi River Sunset Cruise',
      description: 'Enjoy a relaxing evening cruise with music and dance on the Mandovi River.',
      destination: 'Goa',
      category: ExperienceCategory.CULTURAL,
      availability: ExperienceAvailability.AVAILABLE,
      price: 130,
      durationHours: 3,
      capacity: 20,
      booked: 0,
      image: 'https://picsum.photos/seed/mandovi/800/600',
      nextSlot: '2026-09-01T17:00:00Z',
      slots: [],
    },

    {
      id: 'goa-exp-1',
      partnerId: 'exp-partner-goa',
      title: 'Dudhsagar Waterfalls Trek',
      description: 'A thrilling trek through the lush forests to the majestic Dudhsagar waterfalls.',
      destination: 'Goa',
      category: ExperienceCategory.ADVENTURE,
      availability: ExperienceAvailability.AVAILABLE,
      price: 91,
      durationHours: 6,
      capacity: 6,
      booked: 0,
      image: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&q=80&w=800',
      nextSlot: '2026-09-01T10:00:00Z',
      slots: [],
    },
    {
      id: 'goa-exp-2',
      partnerId: 'exp-partner-goa',
      title: 'Old Goa Heritage Walk',
      description: 'Explore the stunning churches and Portuguese architecture of Old Goa.',
      destination: 'Goa',
      category: ExperienceCategory.CULTURAL,
      availability: ExperienceAvailability.AVAILABLE,
      price: 114,
      durationHours: 4,
      capacity: 18,
      booked: 0,
      image: 'https://images.unsplash.com/photo-1506461883276-59f1de8a192c?auto=format&fit=crop&q=80&w=800',
      nextSlot: '2026-09-01T10:00:00Z',
      slots: [],
    },
    {
      id: 'goa-exp-3',
      partnerId: 'exp-partner-goa',
      title: 'Mandovi River Sunset Cruise',
      description: 'Enjoy a relaxing evening cruise with music and dance on the Mandovi River.',
      destination: 'Goa',
      category: ExperienceCategory.CULTURAL,
      availability: ExperienceAvailability.AVAILABLE,
      price: 62,
      durationHours: 6,
      capacity: 15,
      booked: 0,
      image: 'https://images.unsplash.com/photo-1528127269-e70d4c82c2a2?auto=format&fit=crop&q=80&w=800',
      nextSlot: '2026-09-01T10:00:00Z',
      slots: [],
    },
    {
      id: 'jaipur-exp-1',
      partnerId: 'exp-partner-jaipur',
      title: 'Amer Fort Guided Tour',
      description: 'A majestic guided tour exploring the historic and beautiful Amer Fort.',
      destination: 'Jaipur',
      category: ExperienceCategory.CULTURAL,
      availability: ExperienceAvailability.AVAILABLE,
      price: 119,
      durationHours: 2,
      capacity: 13,
      booked: 0,
      image: 'https://images.unsplash.com/photo-1530789253388-f169f24b55da?auto=format&fit=crop&q=80&w=800',
      nextSlot: '2026-09-01T10:00:00Z',
      slots: [],
    },
    {
      id: 'jaipur-exp-2',
      partnerId: 'exp-partner-jaipur',
      title: 'Jaipur Hot Air Balloon Safari',
      description: 'Witness the Pink City from the sky in a hot air balloon.',
      destination: 'Jaipur',
      category: ExperienceCategory.ADVENTURE,
      availability: ExperienceAvailability.AVAILABLE,
      price: 146,
      durationHours: 6,
      capacity: 13,
      booked: 0,
      image: 'https://images.unsplash.com/photo-1518182170546-076616fd73fb?auto=format&fit=crop&q=80&w=800',
      nextSlot: '2026-09-01T10:00:00Z',
      slots: [],
    },
    {
      id: 'jaipur-exp-3',
      partnerId: 'exp-partner-jaipur',
      title: 'Chokhi Dhani Cultural Evening',
      description: 'Experience traditional Rajasthani culture, food, and folk dances.',
      destination: 'Jaipur',
      category: ExperienceCategory.CULTURAL,
      availability: ExperienceAvailability.AVAILABLE,
      price: 187,
      durationHours: 5,
      capacity: 15,
      booked: 0,
      image: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&q=80&w=800',
      nextSlot: '2026-09-01T10:00:00Z',
      slots: [],
    },
    {
      id: 'mumbai-exp-1',
      partnerId: 'exp-partner-mumbai',
      title: 'Dharavi Slum Guided Tour',
      description: 'An insightful and respectful walking tour of the industrious Dharavi.',
      destination: 'Mumbai',
      category: ExperienceCategory.CULTURAL,
      availability: ExperienceAvailability.AVAILABLE,
      price: 157,
      durationHours: 5,
      capacity: 10,
      booked: 0,
      image: 'https://images.unsplash.com/photo-1531366936337-caa3145453e0?auto=format&fit=crop&q=80&w=800',
      nextSlot: '2026-09-01T10:00:00Z',
      slots: [],
    },
    {
      id: 'mumbai-exp-2',
      partnerId: 'exp-partner-mumbai',
      title: 'Elephanta Caves Excursion',
      description: 'Take a ferry ride to explore the ancient rock-cut temples of Elephanta.',
      destination: 'Mumbai',
      category: ExperienceCategory.CULTURAL,
      availability: ExperienceAvailability.AVAILABLE,
      price: 177,
      durationHours: 6,
      capacity: 16,
      booked: 0,
      image: 'https://images.unsplash.com/photo-1541086095944-f49558f62f3a?auto=format&fit=crop&q=80&w=800',
      nextSlot: '2026-09-01T10:00:00Z',
      slots: [],
    },
    {
      id: 'mumbai-exp-3',
      partnerId: 'exp-partner-mumbai',
      title: 'Bollywood Studio Tour',
      description: 'Go behind the scenes and experience the magic of Bollywood.',
      destination: 'Mumbai',
      category: ExperienceCategory.CULTURAL,
      availability: ExperienceAvailability.AVAILABLE,
      price: 147,
      durationHours: 4,
      capacity: 18,
      booked: 0,
      image: 'https://images.unsplash.com/photo-1526772662000-28564db73f62?auto=format&fit=crop&q=80&w=800',
      nextSlot: '2026-09-01T10:00:00Z',
      slots: [],
    },
    {
      id: 'delhi-exp-1',
      partnerId: 'exp-partner-delhi',
      title: 'Old Delhi Heritage Walk & Food Tour',
      description: 'Walk through the narrow lanes of Chandni Chowk and taste authentic street food.',
      destination: 'Delhi',
      category: ExperienceCategory.CULINARY,
      availability: ExperienceAvailability.AVAILABLE,
      price: 166,
      durationHours: 4,
      capacity: 17,
      booked: 0,
      image: 'https://images.unsplash.com/photo-1548013146-724751f7bb9c?auto=format&fit=crop&q=80&w=800',
      nextSlot: '2026-09-01T10:00:00Z',
      slots: [],
    },
    {
      id: 'delhi-exp-2',
      partnerId: 'exp-partner-delhi',
      title: 'Qutub Minar & Red Fort Tour',
      description: 'A historical journey covering the iconic monuments of Delhi.',
      destination: 'Delhi',
      category: ExperienceCategory.CULTURAL,
      availability: ExperienceAvailability.AVAILABLE,
      price: 141,
      durationHours: 4,
      capacity: 6,
      booked: 0,
      image: 'https://images.unsplash.com/photo-1517400508547-063db15a7fc1?auto=format&fit=crop&q=80&w=800',
      nextSlot: '2026-09-01T10:00:00Z',
      slots: [],
    },
    {
      id: 'delhi-exp-3',
      partnerId: 'exp-partner-delhi',
      title: 'Lotus Temple & Akshardham Visit',
      description: 'Explore the architectural marvels and spiritual centers of the capital.',
      destination: 'Delhi',
      category: ExperienceCategory.CULTURAL,
      availability: ExperienceAvailability.AVAILABLE,
      price: 70,
      durationHours: 6,
      capacity: 6,
      booked: 0,
      image: 'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?auto=format&fit=crop&q=80&w=800',
      nextSlot: '2026-09-01T10:00:00Z',
      slots: [],
    },
    {
      id: 'kerala-exp-1',
      partnerId: 'exp-partner-kerala',
      title: 'Alleppey Backwater Houseboat Cruise',
      description: 'A peaceful overnight stay in a traditional Kerala houseboat.',
      destination: 'Kerala',
      category: ExperienceCategory.WELLNESS,
      availability: ExperienceAvailability.AVAILABLE,
      price: 159,
      durationHours: 4,
      capacity: 9,
      booked: 0,
      image: 'https://images.unsplash.com/photo-1537237072461-9c60010be534?auto=format&fit=crop&q=80&w=800',
      nextSlot: '2026-09-01T10:00:00Z',
      slots: [],
    },
    {
      id: 'kerala-exp-2',
      partnerId: 'exp-partner-kerala',
      title: 'Munnar Tea Estate Tour',
      description: 'Walk through the sprawling tea gardens and learn about tea processing.',
      destination: 'Kerala',
      category: ExperienceCategory.CULTURAL,
      availability: ExperienceAvailability.AVAILABLE,
      price: 157,
      durationHours: 4,
      capacity: 5,
      booked: 0,
      image: 'https://images.unsplash.com/photo-1490077476142-d61cc083d09a?auto=format&fit=crop&q=80&w=800',
      nextSlot: '2026-09-01T10:00:00Z',
      slots: [],
    },
    {
      id: 'kerala-exp-3',
      partnerId: 'exp-partner-kerala',
      title: 'Periyar Wildlife Safari',
      description: 'An exciting wildlife boat safari to spot elephants and exotic birds.',
      destination: 'Kerala',
      category: ExperienceCategory.WILDLIFE,
      availability: ExperienceAvailability.AVAILABLE,
      price: 132,
      durationHours: 6,
      capacity: 14,
      booked: 0,
      image: 'https://images.unsplash.com/photo-1524396309943-e03f5249f002?auto=format&fit=crop&q=80&w=800',
      nextSlot: '2026-09-01T10:00:00Z',
      slots: [],
    }
  ];

  create(partnerId: string, data: Partial<Experience>): Experience {
    const exp: Experience = {
      id: data.id || createId(),
      partnerId,
      title: data.title!,
      description: data.description!,
      destination: data.destination!,
      category: data.category!,
      availability: data.availability ?? ExperienceAvailability.AVAILABLE,
      price: data.price!,
      durationHours: data.durationHours!,
      capacity: data.capacity ?? 0,
      booked: data.booked ?? 0,
      image: data.image ?? '',
      nextSlot: data.nextSlot ?? '',
      slots: data.slots ?? [],
    };
    this.experiences.push(exp);
    return cloneExperience(exp);
  }

  findAll(): Experience[] {
    return [...this.experiences]
      .sort((a, b) => a.title.localeCompare(b.title))
      .map(cloneExperience);
  }

  findById(id: string): Experience | undefined {
    const experience = this.experiences.find((e) => e.id === id);
    return experience ? cloneExperience(experience) : undefined;
  }

  findByPartnerId(partnerId: string): Experience[] {
    return this.experiences
      .filter((experience) => experience.partnerId === partnerId)
      .map(cloneExperience);
  }

  findByLocation(locationId: string): Experience[] {
    const q = locationId.toLowerCase();
    return this.experiences
      .filter((e) => e.destination.toLowerCase().includes(q))
      .map(cloneExperience);
  }

  findByCategory(category: ExperienceCategory): Experience[] {
    return this.experiences
      .filter((e) => e.category === category)
      .map(cloneExperience);
  }

  update(id: string, data: Partial<Experience>): Experience | undefined {
    const idx = this.experiences.findIndex((e) => e.id === id);
    if (idx === -1) return undefined;
    this.experiences[idx] = { ...this.experiences[idx], ...data };
    return cloneExperience(this.experiences[idx]);
  }

  delete(id: string): boolean {
    const idx = this.experiences.findIndex((e) => e.id === id);
    if (idx === -1) return false;
    this.experiences.splice(idx, 1);
    return true;
  }
}

function cloneExperience(experience: Experience): Experience {
  return {
    ...experience,
    slots: experience.slots.map((slot) => ({ ...slot })),
  };
}
