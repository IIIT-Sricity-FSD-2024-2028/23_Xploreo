import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReviewsRepository } from './reviews.repository';
import { HotelsService } from '../hotels/hotels.service';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly reviewsRepository: ReviewsRepository,
    private readonly hotelsService: HotelsService,
  ) {}

  create(dto: CreateReviewDto) {
    const review = this.reviewsRepository.create(dto);
    
    // Update the target entity's average rating
    if (dto.targetType === 'hotel') {
      try {
        this.hotelsService.addReviewRating(dto.targetId, dto.rating);
      } catch (err) {
        // If hotel is not found, we still return the created review
        console.warn(`Could not update rating for hotel ${dto.targetId}: ${err.message}`);
      }
    }

    return review;
  }

  findAll() {
    return this.reviewsRepository.findAll();
  }

  findOne(id: number) {
    const review = this.reviewsRepository.findById(id);
    if (!review) throw new NotFoundException(`Review ${id} not found`);
    return review;
  }

  update(id: number, dto: UpdateReviewDto) {
    const updated = this.reviewsRepository.update(id, dto);
    if (!updated) throw new NotFoundException(`Review ${id} not found`);
    return updated;
  }

  remove(id: number) {
    const deleted = this.reviewsRepository.delete(id);
    if (!deleted) throw new NotFoundException(`Review ${id} not found`);
    return { message: `Review ${id} deleted` };
  }
}
