import { Injectable } from '@nestjs/common';
import { CreateReviewDto, ReviewTargetType } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

export type Review = {
  id: number;
  userId: number;
  targetType: ReviewTargetType;
  targetId: string;
  rating: number;
  comment: string;
  image?: string;
  createdAt: Date;
};

@Injectable()
export class ReviewsRepository {
  private reviews: Review[] = [
    {
      id: 1,
      userId: 20001,
      targetType: ReviewTargetType.GUIDE,
      targetId: '10001',
      rating: 5,
      comment: 'Friendly guide and a very well planned city walk.',
      createdAt: new Date(),
    },
  ];

  private nextId = 2;

  create(dto: CreateReviewDto): Review {
    const review: Review = {
      id: this.nextId++,
      userId: dto.userId,
      targetType: dto.targetType,
      targetId: dto.targetId,
      rating: dto.rating,
      comment: dto.comment,
      createdAt: new Date(),
    };

    this.reviews.push(review);
    return review;
  }

  findAll(): Review[] {
    return [...this.reviews].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  findById(id: number): Review | undefined {
    return this.reviews.find((item) => item.id === id);
  }

  update(id: number, dto: UpdateReviewDto): Review | undefined {
    const index = this.reviews.findIndex((item) => item.id === id);
    if (index === -1) return undefined;

    this.reviews[index] = {
      ...this.reviews[index],
      ...dto,
      id: this.reviews[index].id,
      createdAt: this.reviews[index].createdAt,
    };

    return this.reviews[index];
  }

  delete(id: number): boolean {
    const index = this.reviews.findIndex((item) => item.id === id);
    if (index === -1) return false;
    this.reviews.splice(index, 1);
    return true;
  }
}
