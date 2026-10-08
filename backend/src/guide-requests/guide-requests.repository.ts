import { Injectable } from '@nestjs/common';
import { createId } from '../common/utils/id';
import {
  GuideRequest,
  GuideRequestStatus,
} from './entities/guide-request.entity';

@Injectable()
export class GuideRequestsRepository {
  private requests: GuideRequest[] = [
    {
      id: 'guide-request-1',
      travellerId: '20004',
      tripId: 'trip-guide-request-1',
      experienceId: 'trip-guide-request-1-legacy-experience-1',
      status: GuideRequestStatus.PENDING,
    },
  ];

  create(data: Partial<GuideRequest>): GuideRequest {
    const request: GuideRequest = {
      id: data.id || createId(),
      travellerId: data.travellerId!,
      tripId: data.tripId!,
      experienceId: data.experienceId!,
      guideId: data.guideId || undefined,
      travellerName: data.travellerName,
      destination: data.destination,
      itinerarySummary: data.itinerarySummary || [],
      status: data.status || GuideRequestStatus.PENDING,
    };

    this.requests.push(request);
    return request;
  }

  findOpenDuplicate(
    travellerId: string,
    tripId: string,
    experienceId: string,
  ): GuideRequest | undefined {
    return this.requests.find(
      (request) =>
        request.travellerId === travellerId &&
        request.tripId === tripId &&
        request.experienceId === experienceId &&
        [GuideRequestStatus.PENDING, GuideRequestStatus.ACCEPTED].includes(
          request.status,
        ),
    );
  }

  findById(id: string): GuideRequest | undefined {
    return this.requests.find((request) => request.id === id);
  }

  findAll(): GuideRequest[] {
    return [...this.requests];
  }

  findByGuide(guideId: string): GuideRequest[] {
    return this.requests.filter(
      (request) =>
        request.status === GuideRequestStatus.PENDING &&
        (!request.guideId || request.guideId === guideId),
    );
  }

  findByTraveller(travellerId: string): GuideRequest[] {
    return this.requests.filter(
      (request) => request.travellerId === travellerId,
    );
  }

  update(id: string, data: Partial<GuideRequest>): GuideRequest | undefined {
    const index = this.requests.findIndex((request) => request.id === id);
    if (index === -1) return undefined;

    this.requests[index] = {
      ...this.requests[index],
      ...data,
    };

    return this.requests[index];
  }

  delete(id: string): boolean {
    const index = this.requests.findIndex((request) => request.id === id);
    if (index === -1) return false;
    this.requests.splice(index, 1);
    return true;
  }
}
